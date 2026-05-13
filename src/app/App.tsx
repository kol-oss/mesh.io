import "./styles/index.scss";
import { Navigate, Route, Routes } from "react-router-dom";

import Help from "../features/help/pages/Help/Help";
import Workspace from "../features/board/pages/Workspace/Workspace";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Workspace />} />
      <Route path="/docs/*" element={<Help />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
