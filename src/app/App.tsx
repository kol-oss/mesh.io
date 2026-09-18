import "@/app/styles/index.scss";
import { Navigate, Route, Routes } from "react-router-dom";

import Help from "@/features/help/pages/Help/Help";
import Workspace from "@/features/workspace/pages/Workspace/Workspace";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Workspace />} />
      <Route path="/docs/*" element={<Help />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
