import { spawn } from "node:child_process";

export function withTimeout(promise, milliseconds, label = "Operacao") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} excedeu ${milliseconds} ms.`)), milliseconds);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: options.cwd, windowsHide: true, env: { ...process.env, ...(options.env || {}) } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; options.onStdout?.(String(chunk)); });
    child.stderr.on("data", (chunk) => { stderr += chunk; options.onStderr?.(String(chunk)); });
    child.on("error", reject);
    child.on("close", (code, signal) => code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error(`${command} terminou com codigo ${code ?? "nulo"}${signal ? ` e sinal ${signal}` : ""}: ${stderr.slice(-1200)}`), { code, signal, stdout, stderr })));
  });
}
