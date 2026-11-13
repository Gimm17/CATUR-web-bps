import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaCropAlt,
  FaArrowsAltH,
  FaArrowsAltV,
  FaUndo,
  FaRedo,
  FaCheck,
  FaTimes,
  FaSyncAlt,
  FaImage,
  FaSignature,
} from "react-icons/fa";

const MIN_CROP_SIZE = 0.08; // minimal 8% lebar/tinggi gambar

/**
 * Helper me-render image source dengan transformasi (flipH, flipV, rotation, cropRect)
 * dan menghasilkan { dataUrl, file } murni di browser (Client-Side HTML5 Canvas).
 */
export async function renderTransformedSignature(
  imageSrc,
  { flipH = false, flipV = false, rotation = 0, cropRect = null } = {},
  fileName = "signature-edited.png"
) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const normRot = ((rotation % 360) + 360) % 360;
        const swapDims = normRot === 90 || normRot === 270;
        const baseW = swapDims ? img.naturalHeight || img.height : img.naturalWidth || img.width;
        const baseH = swapDims ? img.naturalWidth || img.width : img.naturalHeight || img.height;

        // 1. Canvas pertama: terapkan rotasi + mirror pada gambar utuh
        const workCanvas = document.createElement("canvas");
        workCanvas.width = Math.max(1, baseW);
        workCanvas.height = Math.max(1, baseH);
        const workCtx = workCanvas.getContext("2d");

        workCtx.save();
        workCtx.translate(workCanvas.width / 2, workCanvas.height / 2);
        if (normRot !== 0) {
          workCtx.rotate((normRot * Math.PI) / 180);
        }
        workCtx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        const drawW = img.naturalWidth || img.width;
        const drawH = img.naturalHeight || img.height;
        workCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        workCtx.restore();

        // 2. Jika ada cropRect (0..1), potong dari workCanvas
        const rect = cropRect || { x: 0, y: 0, w: 1, h: 1 };
        const sx = Math.max(0, Math.round(rect.x * workCanvas.width));
        const sy = Math.max(0, Math.round(rect.y * workCanvas.height));
        const sw = Math.max(1, Math.min(workCanvas.width - sx, Math.round(rect.w * workCanvas.width)));
        const sh = Math.max(1, Math.min(workCanvas.height - sy, Math.round(rect.h * workCanvas.height)));

        const outCanvas = document.createElement("canvas");
        outCanvas.width = sw;
        outCanvas.height = sh;
        const outCtx = outCanvas.getContext("2d");
        outCtx.drawImage(workCanvas, sx, sy, sw, sh, 0, 0, sw, sh);

        const dataUrl = outCanvas.toDataURL("image/png");
        outCanvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Gagal memproses gambar tanda tangan"));
              return;
            }
            const cleanName = (fileName || "ttd.png").replace(/\.[^.]+$/, "") + ".png";
            const file = new File([blob], cleanName, { type: "image/png" });
            resolve({ dataUrl, file });
          },
          "image/png",
          0.95
        );
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Gagal memuat gambar untuk diedit"));
    img.src = imageSrc;
  });
}

/**
 * Komponen Editor Tanda Tangan Interaktif (Crop, Mirror Horizontal/Vertikal, Putar 90°)
 * 100% Client-Side Canvas — 0 beban ke server hosting.
 */
const SignatureImageEditor = ({
  previewUrl,
  originalSourceUrl,
  isNewDraftSelected,
  fileName,
  theme,
  onApplyResult,
  onPendingCropChange,
  onClear,
  onTriggerFileSelect,
}) => {
  const [isCropping, setIsCropping] = useState(false);
  const [cropRect, setCropRect] = useState({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
  const [processing, setProcessing] = useState(false);
  const [editorNotice, setEditorNotice] = useState("");

  const containerRef = useRef(null);
  const dragStateRef = useRef(null);

  useEffect(() => {
    if (onPendingCropChange) {
      onPendingCropChange(isCropping ? { isCropping: true, cropRect, previewUrl, fileName } : null);
    }
  }, [isCropping, cropRect, previewUrl, fileName, onPendingCropChange]);

  // Reset mode crop jika gambar dihapus
  useEffect(() => {
    if (!previewUrl) {
      setIsCropping(false);
      setEditorNotice("");
    }
  }, [previewUrl]);

  // Eksekusi transformasi instan (Mirror H, Mirror V, Rotate) pada gambar yang sedang tampil
  const handleQuickTransform = async (transformOpts, label) => {
    if (!previewUrl || processing) return;
    try {
      setProcessing(true);
      const { dataUrl, file } = await renderTransformedSignature(
        previewUrl,
        transformOpts,
        fileName || "ttd-edited.png"
      );
      onApplyResult({ dataUrl, file });
      setEditorNotice(label);
    } catch (err) {
      console.error("Error transforming TTD:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Terapkan pemotongan (Crop)
  const handleConfirmCrop = useCallback(async () => {
    if (!previewUrl || processing) return null;
    try {
      setProcessing(true);
      const { dataUrl, file } = await renderTransformedSignature(
        previewUrl,
        { cropRect },
        fileName || "ttd-cropped.png"
      );
      setIsCropping(false);
      onApplyResult({ dataUrl, file });
      setEditorNotice("Area tanda tangan berhasil dipotong (Crop)");
      return { dataUrl, file };
    } catch (err) {
      console.error("Error cropping TTD:", err);
      return null;
    } finally {
      setProcessing(false);
    }
  }, [previewUrl, processing, cropRect, fileName, onApplyResult]);

  // Reset kembali ke sumber asli sebelum diedit
  const handleResetOriginal = async () => {
    if (!originalSourceUrl || processing) return;
    try {
      setProcessing(true);
      setIsCropping(false);
      const { dataUrl, file } = await renderTransformedSignature(
        originalSourceUrl,
        {},
        fileName || "ttd-original.png"
      );
      onApplyResult({ dataUrl, file, isReset: true });
      setEditorNotice("Dikembalikan ke gambar asli");
    } catch (err) {
      console.error("Error resetting TTD:", err);
    } finally {
      setProcessing(false);
    }
  };

  // Handler Drag & Resize untuk kotak Crop (Mouse & Touch)
  const getClientCoords = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  const startDrag = (e, mode) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
    if (!containerRef.current) return;
    const bounds = containerRef.current.getBoundingClientRect();
    const { clientX, clientY } = getClientCoords(e);

    dragStateRef.current = {
      mode, // 'move', 'nw', 'ne', 'sw', 'se', 'n', 's', 'w', 'e'
      startX: clientX,
      startY: clientY,
      startRect: { ...cropRect },
      bounds,
    };
  };

  useEffect(() => {
    if (!isCropping) return;

    const handleMove = (e) => {
      const st = dragStateRef.current;
      if (!st) return;
      if (e.cancelable) e.preventDefault();

      const { clientX, clientY } = getClientCoords(e);
      const dx = (clientX - st.startX) / Math.max(1, st.bounds.width);
      const dy = (clientY - st.startY) / Math.max(1, st.bounds.height);
      const s = st.startRect;

      let { x, y, w, h } = s;

      if (st.mode === "move") {
        x = Math.max(0, Math.min(1 - w, s.x + dx));
        y = Math.max(0, Math.min(1 - h, s.y + dy));
      } else {
        if (st.mode.includes("w")) {
          const maxLeftDelta = s.w - MIN_CROP_SIZE;
          const clampedDx = Math.max(-s.x, Math.min(maxLeftDelta, dx));
          x = s.x + clampedDx;
          w = s.w - clampedDx;
        }
        if (st.mode.includes("e")) {
          w = Math.max(MIN_CROP_SIZE, Math.min(1 - s.x, s.w + dx));
        }
        if (st.mode.includes("n")) {
          const maxTopDelta = s.h - MIN_CROP_SIZE;
          const clampedDy = Math.max(-s.y, Math.min(maxTopDelta, dy));
          y = s.y + clampedDy;
          h = s.h - clampedDy;
        }
        if (st.mode.includes("s")) {
          h = Math.max(MIN_CROP_SIZE, Math.min(1 - s.y, s.h + dy));
        }
      }

      setCropRect({ x, y, w, h });
    };

    const handleUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("mousemove", handleMove, { passive: false });
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleUp);
    };
  }, [isCropping, cropRect]);

  const handleStyle = (posStyle, cursor) => ({
    position: "absolute",
    width: "14px",
    height: "14px",
    backgroundColor: "#ffffff",
    border: `2px solid ${theme.primary || "#2563EB"}`,
    borderRadius: "50%",
    cursor,
    zIndex: 6,
    ...posStyle,
  });

  if (!previewUrl) {
    return (
      <div
        className="border-2 border-dashed rounded-3 p-4 text-center"
        style={{
          borderColor: theme.light,
          backgroundColor: `${theme.background}80`,
          minHeight: "230px",
        }}
      >
        <div
          className="py-5"
          style={{ cursor: "pointer" }}
          onClick={onTriggerFileSelect}
        >
          <FaImage size={48} className="text-muted mb-3 opacity-50" />
          <h6 className="text-muted mb-2">Belum ada file baru dipilih</h6>
          <p className="text-muted small mb-0">
            Klik di sini atau tombol &quot;Pilih File&quot; di bawah untuk memilih gambar tanda tangan baru
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="border-2 border-dashed rounded-3 p-3 text-center"
      style={{
        borderColor: isNewDraftSelected ? theme.success : theme.signature,
        backgroundColor: isNewDraftSelected ? `${theme.success}05` : `${theme.background}80`,
        minHeight: "260px",
        position: "relative",
      }}
    >
      {/* Toolbar Edit Tanda Tangan: Crop, Mirror H, Mirror V, Rotate, Reset */}
      <div className="d-flex flex-wrap justify-content-center gap-2 mb-3 pb-2 border-bottom">
        {!isCropping ? (
          <>
            <button
              type="button"
              className="btn btn-sm btn-outline-primary d-flex align-items-center"
              disabled={processing}
              onClick={() => {
                setCropRect({ x: 0.08, y: 0.08, w: 0.84, h: 0.84 });
                setIsCropping(true);
                setEditorNotice("");
              }}
              title="Potong area tanda tangan"
            >
              <FaCropAlt className="me-1" />
              Crop / Potong
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center"
              disabled={processing}
              onClick={() => handleQuickTransform({ flipH: true }, "Dibalik secara Horizontal (Mirror Kiri-Kanan)")}
              title="Mirror Kiri-Kanan (Flip Horizontal)"
            >
              <FaArrowsAltH className="me-1" />
              Mirror Kiri-Kanan
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center"
              disabled={processing}
              onClick={() => handleQuickTransform({ flipV: true }, "Dibalik secara Vertikal (Mirror Atas-Bawah)")}
              title="Mirror Atas-Bawah (Flip Vertikal)"
            >
              <FaArrowsAltV className="me-1" />
              Mirror Atas-Bawah
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center"
              disabled={processing}
              onClick={() => handleQuickTransform({ rotation: -90 }, "Diputar 90° ke Kiri")}
              title="Putar 90° ke Kiri"
            >
              <FaUndo className="me-1" />
              Putar Kiri
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center"
              disabled={processing}
              onClick={() => handleQuickTransform({ rotation: 90 }, "Diputar 90° ke Kanan")}
              title="Putar 90° ke Kanan"
            >
              <FaRedo className="me-1" />
              Putar Kanan
            </button>

            {originalSourceUrl && originalSourceUrl !== previewUrl && (
              <button
                type="button"
                className="btn btn-sm btn-outline-warning d-flex align-items-center"
                disabled={processing}
                onClick={handleResetOriginal}
                title="Kembalikan ke gambar awal sebelum diedit"
              >
                <FaSyncAlt className="me-1" />
                Reset Edit
              </button>
            )}
          </>
        ) : (
          <>
            <span className="badge bg-primary d-flex align-items-center px-3 py-2">
              <FaCropAlt className="me-2" />
              Geser kotak / tarik titik sudut untuk mengatur area potong
            </span>

            <button
              type="button"
              className="btn btn-sm btn-success d-flex align-items-center fw-semibold"
              disabled={processing}
              onClick={handleConfirmCrop}
            >
              <FaCheck className="me-1" />
              Terapkan Crop
            </button>

            <button
              type="button"
              className="btn btn-sm btn-outline-secondary d-flex align-items-center"
              disabled={processing}
              onClick={() => setIsCropping(false)}
            >
              <FaTimes className="me-1" />
              Batal Crop
            </button>
          </>
        )}
      </div>

      {/* Area Gambar & Interactive Cropper */}
      <div className="position-relative d-inline-block">
        <div
          ref={containerRef}
          className="position-relative d-inline-block rounded shadow-sm"
          style={{
            border: `2px solid ${isNewDraftSelected ? theme.success : theme.signature}`,
            backgroundColor: "#ffffff",
            backgroundImage:
              "linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)",
            backgroundSize: "16px 16px",
            backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
            padding: isCropping ? "0px" : "10px",
            userSelect: "none",
            touchAction: isCropping ? "none" : "auto",
            overflow: "hidden",
          }}
        >
          <img
            src={previewUrl}
            alt="Preview Tanda Tangan"
            className="img-fluid d-block"
            draggable={false}
            onClick={() => {
              if (!isCropping && onTriggerFileSelect) {
                onTriggerFileSelect();
              }
            }}
            title={!isCropping ? "Klik untuk memilih/mengganti file tanda tangan, atau gunakan tombol Crop/Mirror di atas" : undefined}
            style={{
              maxHeight: "220px",
              maxWidth: "100%",
              cursor: isCropping ? "crosshair" : "pointer",
              userSelect: "none",
            }}
          />

          {/* Overlay Kotak Crop Interaktif */}
          {isCropping && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 4,
              }}
            >
              {/* Area Gelap di Luar Crop */}
              <div
                onMouseDown={(e) => startDrag(e, "move")}
                onTouchStart={(e) => startDrag(e, "move")}
                style={{
                  position: "absolute",
                  left: `${cropRect.x * 100}%`,
                  top: `${cropRect.y * 100}%`,
                  width: `${cropRect.w * 100}%`,
                  height: `${cropRect.h * 100}%`,
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
                  border: "2px dashed #ffffff",
                  outline: `2px solid ${theme.primary || "#2563EB"}`,
                  cursor: "move",
                  zIndex: 5,
                }}
              >
                {/* Grid Rule of Thirds */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.4) 1px, transparent 1px)",
                    backgroundSize: "33.33% 33.33%",
                    pointerEvents: "none",
                  }}
                />

                {/* 4 Corner Handles + 4 Edge Handles */}
                <div
                  onMouseDown={(e) => startDrag(e, "nw")}
                  onTouchStart={(e) => startDrag(e, "nw")}
                  style={handleStyle({ top: "-7px", left: "-7px" }, "nwse-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "ne")}
                  onTouchStart={(e) => startDrag(e, "ne")}
                  style={handleStyle({ top: "-7px", right: "-7px" }, "nesw-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "sw")}
                  onTouchStart={(e) => startDrag(e, "sw")}
                  style={handleStyle({ bottom: "-7px", left: "-7px" }, "nesw-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "se")}
                  onTouchStart={(e) => startDrag(e, "se")}
                  style={handleStyle({ bottom: "-7px", right: "-7px" }, "nwse-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "n")}
                  onTouchStart={(e) => startDrag(e, "n")}
                  style={handleStyle({ top: "-7px", left: "calc(50% - 7px)" }, "ns-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "s")}
                  onTouchStart={(e) => startDrag(e, "s")}
                  style={handleStyle({ bottom: "-7px", left: "calc(50% - 7px)" }, "ns-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "w")}
                  onTouchStart={(e) => startDrag(e, "w")}
                  style={handleStyle({ top: "calc(50% - 7px)", left: "-7px" }, "ew-resize")}
                />
                <div
                  onMouseDown={(e) => startDrag(e, "e")}
                  onTouchStart={(e) => startDrag(e, "e")}
                  style={handleStyle({ top: "calc(50% - 7px)", right: "-7px" }, "ew-resize")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Tombol X (Bersihkan / Batal Pilihan) */}
        {!isCropping && (
          <button
            type="button"
            className="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 rounded-circle shadow"
            style={{ width: "30px", height: "30px", zIndex: 7 }}
            title={isNewDraftSelected ? "Batalkan pilihan file baru" : "Bersihkan preview"}
            onClick={onClear}
          >
            <FaTimes size={12} />
          </button>
        )}
      </div>

      {/* Keterangan Status di Bawah Preview */}
      <div className="mt-3">
        {editorNotice && (
          <div className="small text-info fw-semibold mb-1">
            ✓ {editorNotice}
          </div>
        )}
        {isNewDraftSelected ? (
          <small className="text-success fw-semibold d-block">
            <FaCheck className="me-1" />
            File siap disimpan ({fileName}) — klik tombol simpan di bawah untuk mengupload
          </small>
        ) : (
          <small className="text-primary d-block">
            <FaSignature className="me-1" />
            Tanda tangan aktif saat ini — Anda bisa langsung <strong>Crop / Mirror</strong> gambar di atas atau pilih file baru di bawah
          </small>
        )}
      </div>
    </div>
  );
};

export default SignatureImageEditor;
