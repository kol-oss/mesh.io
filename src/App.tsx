import "./styles/index.scss";
import { Navigate, Route, Routes } from "react-router-dom";

import WorkspacePage from "./pages/Workspace/WorkspacePage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<WorkspacePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
