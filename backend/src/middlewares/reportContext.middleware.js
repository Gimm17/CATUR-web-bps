const reportContextService = require('../services/reportContext.service');
const { assertReportEditable } = require('../services/reportWindow.service');

function createLoadOwnedReportContext({
  getOwnedReportContext = reportContextService.getOwnedReportContext,
} = {}) {
  return async function loadOwnedReportContext(req, res, next) {
    try {
      const bodySuratId = req.body?.surat_tugas_id;
      if (bodySuratId !== undefined
        && String(bodySuratId) !== String(req.params?.suratId)) {
        const error = new Error('ID surat tugas pada URL dan body tidak sama.');
        error.status = 400;
        error.code = 'SURAT_ID_MISMATCH';
        throw error;
      }
      req.reportContext = await getOwnedReportContext({
        suratId: req.params?.suratId,
        userId: req.user?.id,
      });
      return next();
    } catch (error) {
      const isKnownError = Number.isInteger(error.status) && error.code;
      const status = isKnownError ? error.status : 500;
      return res.status(status).json({
        code: isKnownError ? error.code : 'INTERNAL_SERVER_ERROR',
        message: isKnownError ? error.message : 'Terjadi kesalahan pada server.',
      });
    }
  };
}

const loadOwnedReportContext = createLoadOwnedReportContext();

function requireEditableReportContext(req, res, next) {
  try {
    assertReportEditable(req.reportContext?.reportWindow);
    return next();
  } catch (error) {
    return res.status(error.status || 409).json({
      success: false,
      code: error.code || 'REPORT_LOCKED_BY_STATUS',
      message: error.message,
      report_window: error.reportWindow || req.reportContext?.reportWindow,
    });
  }
}

module.exports = loadOwnedReportContext;
module.exports.createLoadOwnedReportContext = createLoadOwnedReportContext;
module.exports.requireEditableReportContext = requireEditableReportContext;
