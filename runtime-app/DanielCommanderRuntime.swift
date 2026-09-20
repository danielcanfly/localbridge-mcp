import Foundation
import Darwin

final class SupervisorState: @unchecked Sendable {
    let lock = NSLock()
    var stopping = false
    var child: Process?

    func requestStop() {
        lock.lock()
        stopping = true
        let runningChild = child
        lock.unlock()
        if let runningChild, runningChild.isRunning {
            runningChild.terminate()
        }
    }

    func isStopping() -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return stopping
    }

    func setChild(_ process: Process?) {
        lock.lock()
        child = process
        lock.unlock()
    }
}

let fm = FileManager.default
let env = ProcessInfo.processInfo.environment
let home = fm.homeDirectoryForCurrentUser
let profile = env["DANIEL_COMMANDER_PROFILE"] ?? "daniel-prod"
let tunnelClient = env["DANIEL_COMMANDER_TUNNEL_CLIENT"] ?? "/opt/homebrew/bin/tunnel-client"
let stateDir = URL(fileURLWithPath: env["DANIEL_COMMANDER_STATE_DIR"] ?? home.appendingPathComponent(".local/state/daniel-commander").path)
let logDir = URL(fileURLWithPath: env["DANIEL_COMMANDER_LOG_DIR"] ?? home.appendingPathComponent("Library/Logs/DanielCommander").path)
let runtimeRoot = URL(fileURLWithPath: env["DANIEL_COMMANDER_RUNTIME_ROOT"] ?? home.appendingPathComponent(".local/share/daniel-commander/runtime").path)
let configURL = home.appendingPathComponent(".config/daniel-commander/config.json")
let appLog = logDir.appendingPathComponent("runtime-app.log")
let childLog = logDir.appendingPathComponent("runtime-child.log")
let tccStatus = stateDir.appendingPathComponent("tcc-status")
let appPid = stateDir.appendingPathComponent("runtime-app.pid")
let tunnelPid = stateDir.appendingPathComponent("tunnel-client.pid")
let maxLogBytes: UInt64 = 5 * 1024 * 1024
let keepLogs = 3

func ensureDirectory(_ url: URL) {
    try? fm.createDirectory(at: url, withIntermediateDirectories: true)
}

func timestamp() -> String {
    ISO8601DateFormatter().string(from: Date())
}

func appendLog(_ message: String) {
    ensureDirectory(logDir)
    let line = "\(timestamp()) \(message)\n"
    let data = Data(line.utf8)
    if !fm.fileExists(atPath: appLog.path) {
        fm.createFile(atPath: appLog.path, contents: data)
        try? fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: appLog.path)
        return
    }
    guard let handle = FileHandle(forWritingAtPath: appLog.path) else { return }
    defer { try? handle.close() }
    do {
        try handle.seekToEnd()
        try handle.write(contentsOf: data)
    } catch {
        return
    }
}

func writeText(_ text: String, to url: URL) {
    ensureDirectory(url.deletingLastPathComponent())
    try? text.write(to: url, atomically: true, encoding: .utf8)
    try? fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path)
}

func rotateOne(_ url: URL) {
    guard
        let attrs = try? fm.attributesOfItem(atPath: url.path),
        let number = attrs[.size] as? NSNumber,
        number.uint64Value >= maxLogBytes
    else { return }

    if keepLogs > 1 {
        for index in stride(from: keepLogs, through: 2, by: -1) {
            let src = URL(fileURLWithPath: "\(url.path).\(index - 1)")
            let dst = URL(fileURLWithPath: "\(url.path).\(index)")
            try? fm.removeItem(at: dst)
            if fm.fileExists(atPath: src.path) {
                try? fm.moveItem(at: src, to: dst)
            }
        }
    }

    let first = URL(fileURLWithPath: "\(url.path).1")
    try? fm.removeItem(at: first)
    do {
        try fm.copyItem(at: url, to: first)
        if let handle = FileHandle(forWritingAtPath: url.path) {
            try handle.truncate(atOffset: 0)
            try handle.close()
        }
    } catch {
        appendLog("LOG_ROTATE_ERROR path=\(url.path) error=\(error.localizedDescription)")
    }
}

func rotateLogs() {
    for name in [
        "tunnel-client.jsonl",
        "runtime-app.log",
        "runtime-child.log",
        "launcher.stdout.log",
        "launcher.stderr.log"
    ] {
        rotateOne(logDir.appendingPathComponent(name))
    }
}

func loadAllowedDirectories() -> [String] {
    guard let data = try? Data(contentsOf: configURL) else {
        writeText("config_missing\n", to: tccStatus)
        return []
    }
    guard
        let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let paths = object["allowedDirectories"] as? [String]
    else {
        writeText("config_invalid\n", to: tccStatus)
        return []
    }
    return paths
}

func preflightAllowedDirectories() -> Bool {
    let paths = loadAllowedDirectories()
    guard !paths.isEmpty else {
        appendLog("TCC_PREFLIGHT_BLOCKED reason=no_allowed_directories")
        writeText("no_allowed_directories\n", to: tccStatus)
        return false
    }

    for path in paths {
        do {
            _ = try fm.contentsOfDirectory(atPath: path)
        } catch {
            appendLog("TCC_PREFLIGHT_BLOCKED path=\(path) error=\(error.localizedDescription)")
            writeText("blocked\t\(path)\t\(error.localizedDescription)\n", to: tccStatus)
            return false
        }
    }

    writeText("ok\n", to: tccStatus)
    return true
}

func sleepInterruptibly(_ seconds: Int, state: SupervisorState) {
    for _ in 0..<seconds {
        if state.isStopping() { return }
        Thread.sleep(forTimeInterval: 1)
    }
}

func processCommand(pid: Int32) -> String? {
    let probe = Process()
    probe.executableURL = URL(fileURLWithPath: "/bin/ps")
    probe.arguments = ["-p", String(pid), "-o", "command="]
    let pipe = Pipe()
    probe.standardOutput = pipe
    probe.standardError = FileHandle.nullDevice
    do {
        try probe.run()
        probe.waitUntilExit()
        guard probe.terminationStatus == 0 else { return nil }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines)
    } catch {
        return nil
    }
}

func cleanupStaleTunnel() {
    guard
        let raw = try? String(contentsOf: tunnelPid, encoding: .utf8),
        let pid = Int32(raw.trimmingCharacters(in: .whitespacesAndNewlines)),
        pid > 1
    else {
        try? fm.removeItem(at: tunnelPid)
        try? fm.removeItem(at: stateDir.appendingPathComponent("health-url"))
        return
    }

    guard kill(pid, 0) == 0 else {
        try? fm.removeItem(at: tunnelPid)
        try? fm.removeItem(at: stateDir.appendingPathComponent("health-url"))
        return
    }

    let command = processCommand(pid: pid) ?? ""
    let expectedProfile = "run --profile " + profile
    let expectedPidFile = "--pid.file " + tunnelPid.path
    guard
        command.contains("tunnel-client"),
        command.contains(expectedProfile),
        command.contains(expectedPidFile)
    else {
        appendLog("STALE_TUNNEL_REFUSED pid=\(pid) command=\(command)")
        return
    }

    appendLog("STALE_TUNNEL_CLEANUP pid=\(pid)")
    _ = kill(pid, SIGTERM)
    for _ in 0..<50 {
        if kill(pid, 0) != 0 { break }
        usleep(100_000)
    }
    if kill(pid, 0) == 0 {
        appendLog("STALE_TUNNEL_ESCALATE pid=\(pid)")
        _ = kill(pid, SIGKILL)
    }

    try? fm.removeItem(at: tunnelPid)
    try? fm.removeItem(at: stateDir.appendingPathComponent("health-url"))
}

ensureDirectory(stateDir)
ensureDirectory(logDir)
writeText("\(getpid())\n", to: appPid)
defer { try? fm.removeItem(at: appPid) }

let state = SupervisorState()
signal(SIGTERM, SIG_IGN)
signal(SIGINT, SIG_IGN)

let termSource = DispatchSource.makeSignalSource(signal: SIGTERM, queue: .global())
termSource.setEventHandler { state.requestStop() }
termSource.resume()

let intSource = DispatchSource.makeSignalSource(signal: SIGINT, queue: .global())
intSource.setEventHandler { state.requestStop() }
intSource.resume()

appendLog("RUNTIME_APP_START profile=\(profile) runtime=\(runtimeRoot.path)")
cleanupStaleTunnel()

var tccPreflightPassed = false

while !state.isStopping() {
    rotateLogs()

    if !tccPreflightPassed {
        guard preflightAllowedDirectories() else {
            sleepInterruptibly(15, state: state)
            continue
        }
        tccPreflightPassed = true
        appendLog("TCC_PREFLIGHT_OK")
    }

    let entrypoint = runtimeRoot.appendingPathComponent("dist/src/index.js")
    guard fm.fileExists(atPath: entrypoint.path) else {
        appendLog("RUNTIME_BUNDLE_MISSING entrypoint=\(entrypoint.path)")
        sleepInterruptibly(15, state: state)
        continue
    }

    try? fm.removeItem(at: tunnelPid)
    try? fm.removeItem(at: stateDir.appendingPathComponent("health-url"))

    let process = Process()
    process.executableURL = URL(fileURLWithPath: tunnelClient)
    process.arguments = ["run", "--profile", profile, "--pid.file", tunnelPid.path]
    var childEnv = env
    childEnv["HOME"] = home.path
    childEnv["PATH"] = "/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
    process.environment = childEnv

    ensureDirectory(logDir)
    if !fm.fileExists(atPath: childLog.path) {
        fm.createFile(atPath: childLog.path, contents: nil)
    }
    try? fm.setAttributes([.posixPermissions: 0o600], ofItemAtPath: childLog.path)
    let handle = FileHandle(forWritingAtPath: childLog.path)
    _ = try? handle?.seekToEnd()
    process.standardOutput = handle
    process.standardError = handle

    do {
        try process.run()
    } catch {
        appendLog("TUNNEL_START_ERROR error=\(error.localizedDescription)")
        try? handle?.close()
        sleepInterruptibly(5, state: state)
        continue
    }

    state.setChild(process)
    appendLog("TUNNEL_CHILD_START pid=\(process.processIdentifier)")

    var seconds = 0
    while process.isRunning && !state.isStopping() {
        Thread.sleep(forTimeInterval: 1)
        seconds += 1
        if seconds % 300 == 0 {
            rotateLogs()
        }
    }

    if state.isStopping() && process.isRunning {
        process.terminate()
    }
    process.waitUntilExit()
    state.setChild(nil)
    try? handle?.close()

    appendLog("TUNNEL_CHILD_EXIT status=\(process.terminationStatus) reason=\(process.terminationReason.rawValue)")
    if !state.isStopping() {
        sleepInterruptibly(5, state: state)
    }
}

appendLog("RUNTIME_APP_STOP")
exit(EXIT_SUCCESS)
