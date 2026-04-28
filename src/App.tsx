import "./styles/index.scss";
import { Navigate, Route, Routes } from "react-router-dom";

import Workspace from "./pages/Workspace/Workspace";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Workspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
