import { createContext, useContext, useState } from "react";

const LoadingContext = createContext();

function LoadingProvider({ children }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Loading...");

  function showLoading(text = "Loading...") {
    setMessage(text);
    setLoading(true);
  }

  function hideLoading() {
    setLoading(false);
    setMessage("Loading...");
  }

  const value = {
    loading,
    message,

    showLoading,
    hideLoading,
  };

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

function useLoading() {
  return useContext(LoadingContext);
}

export { LoadingProvider, useLoading };
