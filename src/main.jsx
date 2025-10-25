import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App.jsx";
import Room from "./pages/Room.jsx";
import JoinRoom from "./pages/JoinRoom.jsx";
import "./index.css";
import CreateRoom from "./pages/CreateRoom.jsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <CreateRoom />,
      },
      {
        path: "join-session/:id",
        element: <JoinRoom />,
      },
      {
        path: "session/:id",
        element: <Room />,
      },
    ],
  },
]);
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
