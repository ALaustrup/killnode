import type { ChildProcess } from "node:child_process";

type Managed = { proc: ChildProcess; label: string };

const children = new Set<Managed>();
const shutdownHooks: Array<() => void | Promise<void>> = [];

export function registerShutdownHook(fn: () => void | Promise<void>): void {
  shutdownHooks.push(fn);
}

export function registerManagedChild(proc: ChildProcess, label: string): void {
  const m = { proc, label };
  children.add(m);
  proc.on("exit", () => children.delete(m));
}

export function killAllManagedChildren(): void {
  for (const { proc } of [...children]) {
    try {
      proc.kill("SIGKILL");
    } catch {
      /* ignore */
    }
  }
  children.clear();
}

export async function runShutdownHooks(): Promise<void> {
  for (const fn of [...shutdownHooks].reverse()) {
    await Promise.resolve(fn());
  }
  shutdownHooks.length = 0;
}
