import { useState } from 'react'
import AppRoutes from "./routes/AppRoutes";
import './index.css'
import { Provider } from "react-redux";
import { store } from "./store/index";

function App() {

  return (
    <>
      <Provider  store={store}>
        <AppRoutes />
      </Provider>
    </>
  )
}

export default App
