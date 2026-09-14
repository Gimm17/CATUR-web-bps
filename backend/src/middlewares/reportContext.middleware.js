const reportContextService = require('../services/reportContext.service');

function createLoadOwnedReportContext({
  getOwnedReportContext = reportContextService.getOwnedReportContext,
} = {}) {
  return async function loadOwnedReportContext(req, res, next) {
    try {
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

module.exports = loadOwnedReportContext;
module.exports.createLoadOwnedReportContext = createLoadOwnedReportContext;
