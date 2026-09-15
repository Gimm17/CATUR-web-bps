const Footer = () => {
  return (
    <>
      <div
        className="container-fluid bg-dark text-white-50 footer mt-5 pt-5 wow fadeIn"
        data-wow-delay="0.1s"
      >
        <div className="container py-5">
          <div className="row g-5">
            <div className="col-lg-3 col-md-6">
              <h1 className="text-white">
                Kami<span className="fw-bold text-primary mb-4">Peduli</span>
              </h1>
              <p>
                Kami Peduli siap membantu, Saling Menolong Siapa Saja dan Kapan
                Saja
              </p>
              <div className="d-flex pt-2">
                <a className="btn btn-square me-1" href="">
                  <i className="fab fa-instagram"></i>
                </a>
                <a className="btn btn-square me-1" href="">
                  <i className="fab fa-facebook-f"></i>
                </a>
                <a className="btn btn-square me-1" href="">
                  <i className="fab fa-youtube"></i>
                </a>
                <a className="btn btn-square me-0" href="">
                  <i className="fab fa-github"></i>
                </a>
              </div>
            </div>
            <div className="col-lg-3 col-md-6">
              <h5 className="text-light mb-4">Alamat</h5>
              <p>
                <i className="fa fa-map-marker-alt me-3"></i>Kota Palu, Sulawesi
                Tengah, Indonesia
              </p>
              <p>
                <i className="fa fa-phone-alt me-3"></i>+62 822-7337-0260
              </p>
              <p>
                <i className="fa fa-envelope me-3"></i>kamipeduli@gmail.com
              </p>
            </div>
            <div className="col-lg-3 col-md-6">
              <h5 className="text-light mb-4">Halaman</h5>
              <a className="btn btn-link" href="/">
                Beranda
              </a>
              <a className="btn btn-link" href="/Relawan">
                Relawan
              </a>
              <a className="btn btn-link" href="/info-donasi">
                Donasi
              </a>
              <a className="btn btn-link" href="/Tentang">
                Tentang
              </a>
            </div>
            <div className="col-lg-3 col-md-6">
              <h5 className="text-light m-4">Daftar</h5>
              <p>Ayo kita saling membantu sesama</p>
              <div
                className="position-relative mx-auto"
                style={{ maxWidth: "400px" }}
              >
                <input
                  className="form-control bg-transparent w-100 py-3 ps-4 pe-5"
                  type="text"
                  placeholder="Email"
                />
                <button
                  type="button"
                  className="btn btn-primary py-2 position-absolute top-0 end-0 mt-2 me-2"
                >
                  Daftar
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="container-fluid copyright">
          <div className="container">
            <div className="row">
              <div className="col-md-6 text-center text-md-start mb-3 mb-md-0"></div>
              <center>
                <div className="text-center">
                  Designed By <a>Ekosaviors</a>
                </div>
              </center>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Footer;
