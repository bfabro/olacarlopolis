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
    const abort = () => child.kill("SIGTERM");
    if (options.signal?.aborted) abort();
    else options.signal?.addEventListener("abort", abort, { once: true });
    child.stdout.on("data", (chunk) => { stdout += chunk; options.onStdout?.(String(chunk)); });
    child.stderr.on("data", (chunk) => { stderr += chunk; options.onStderr?.(String(chunk)); });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      options.signal?.removeEventListener("abort", abort);
      if (options.signal?.aborted) return reject(Object.assign(new Error("Processamento cancelado pelo usuário."), { code: "studio_cancelled", signal, stdout, stderr }));
      return code === 0 ? resolve({ stdout, stderr }) : reject(Object.assign(new Error(`${command} terminou com codigo ${code ?? "nulo"}${signal ? ` e sinal ${signal}` : ""}: ${stderr.slice(-1200)}`), { code, signal, stdout, stderr }));
    });
  });
}
