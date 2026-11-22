import { WorkspaceShell } from "../components";

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
