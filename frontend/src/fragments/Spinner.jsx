import React, { useEffect } from "react";

const Spinner = () => {
  useEffect(() => {
    const spinnerTimeout = setTimeout(() => {
      const spinnerElement = document.getElementById("spinner");
      if (spinnerElement) {
        spinnerElement.classList.remove("show");
      }
    }, 1000);

    return () => clearTimeout(spinnerTimeout);
  }, []);

  return (
    <>
      <div
        id="spinner"
        className="show bg-white position-fixed translate-middle w-100 vh-100 top-50 start-50 d-flex align-items-center justify-content-center"
      >
        <div className="spinner-grow text-primary" role="status"></div>
      </div>
    </>
  );
};

export default Spinner;
