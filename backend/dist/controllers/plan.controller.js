"use strict";
/**
 * Training Plan Controller
 *
 * Handles training plan management including:
 * - Training plans CRUD operations
 * - Training sessions CRUD operations
 * - Workout completion logging
 *
 * @module controllers/plan
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCompletion = exports.upsertCompletion = exports.listCompletion = exports.deleteSession = exports.updateSession = exports.getSessionById = exports.createSession = exports.listSessions = exports.deletePlan = exports.updatePlan = exports.getPlanById = exports.createPlan = exports.listPlans = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const TrainingPlan_1 = __importDefault(require("../models/TrainingPlan"));
const TrainingSession_1 = __importDefault(require("../models/TrainingSession"));
const CompletionLog_1 = __importDefault(require("../models/CompletionLog"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const Notification_1 = __importDefault(require("../models/Notification"));
const socketServer_1 = require("../socket/socketServer");
// ============================================================================
// Funcoes auxiliares
// ============================================================================
/**
 * Extracts pagination parameters from request query.
 *
 * @param req - Express request object
 * @param options - Pagination configuration
 * @returns Pagination parameters for database queries
 */
const paginate = (req, options = {}) => {
    var _a, _b;
    const { max = 100, def = 20 } = options;
    const page = Math.max(1, Number.parseInt(String((_a = req.query.page) !== null && _a !== void 0 ? _a : '1'), 10) || 1);
    const limitRaw = Number.parseInt(String((_b = req.query.limit) !== null && _b !== void 0 ? _b : `${def}`), 10);
    const limit = Math.min(max, Math.max(1, limitRaw || def));
    const skip = (page - 1) * limit;
    return { page, limit, skip };
};
/**
 * Validates that a trainer is approved by admin.
 *
 * @param trainerId - The trainer profile ID to validate
 * @throws {HttpError} 403 if trainer is not validated
 */
const ensureTrainerValidated = async (trainerId) => {
    const trainerProfile = await TrainerProfile_1.default.findById(trainerId).select('validatedByAdmin');
    if (!trainerProfile || !trainerProfile.validatedByAdmin) {
        throw (0, http_errors_1.default)(403, 'Trainer não validado.');
    }
};
/**
 * Validates required fields for plan creation.
 *
 * @param payload - The plan creation payload
 * @throws {HttpError} 400 if required fields are missing
 */
const validateCreatePlanPayload = (payload) => {
    const requiredFields = [
        'clientId',
        'trainerId',
        'title',
        'frequencyPerWeek',
        'startDate',
    ];
    const missingFields = requiredFields.filter((field) => !payload[field]);
    if (missingFields.length > 0) {
        throw (0, http_errors_1.default)(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
    }
};
/**
 * Validates required fields for completion logging.
 *
 * @param payload - The completion payload
 * @throws {HttpError} 400 if required fields are missing or status is invalid
 */
const validateCompletionPayload = (payload) => {
    const requiredFields = [
        'clientId',
        'trainerId',
        'planId',
        'sessionId',
        'date',
        'status',
    ];
    const missingFields = requiredFields.filter((field) => !payload[field]);
    if (missingFields.length > 0) {
        throw (0, http_errors_1.default)(400, `Campos obrigatórios: ${requiredFields.join(', ')}.`);
    }
    if (!['DONE', 'MISSED'].includes(payload.status)) {
        throw (0, http_errors_1.default)(400, 'status deve ser DONE ou MISSED.');
    }
};
/**
 * Notifies trainer about workout completion status.
 *
 * @param trainerId - The trainer profile ID
 * @param status - Completion status (DONE or MISSED)
 * @param payload - Notification payload data
 */
const notifyTrainerOfCompletion = async (trainerId, status, payload) => {
    try {
        const trainerProfile = await TrainerProfile_1.default.findById(trainerId).select('userId');
        if (!(trainerProfile === null || trainerProfile === void 0 ? void 0 : trainerProfile.userId))
            return;
        const notificationType = status === 'MISSED' ? 'MISSED_WORKOUT' : 'WORKOUT_DONE';
        const notification = await Notification_1.default.create({
            recipientId: trainerProfile.userId,
            type: notificationType,
            payload,
            isRead: false,
        });
        // Emit real-time notification
        (0, socketServer_1.emitToUser)(String(trainerProfile.userId), 'notification:new', notification);
    }
    catch (error) {
        // Log error but don't block completion
        console.error('[notifyTrainerOfCompletion] Falha ao enviar notificação:', error);
    }
};
// ============================================================================
// Training Plans Endpoints
// ============================================================================
/**
 * Lists training plans with optional filtering.
 *
 * @route GET /api/plans
 * @access Private
 *
 * @param req - Express request with optional query filters (clientId, trainerId)
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {PaginatedResponse<TrainingPlan>} Paginated list of plans
 */
const listPlans = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req);
        const query = {};
        const { clientId, trainerId } = req.query;
        if (clientId)
            query.clientId = clientId;
        if (trainerId)
            query.trainerId = trainerId;
        const [items, total] = await Promise.all([
            TrainingPlan_1.default.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
            TrainingPlan_1.default.countDocuments(query),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
};
exports.listPlans = listPlans;
/**
 * Creates a new training plan for a client.
 *
 * @route POST /api/plans
 * @access Private - TRAINER only
 *
 * @param req - Express request with plan data in body
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingPlan} The created training plan
 * @throws {HttpError} 400 if required fields missing
 * @throws {HttpError} 403 if trainer not validated
 * @throws {HttpError} 404 if client not found
 */
const createPlan = async (req, res, next) => {
    try {
        const payload = req.body;
        validateCreatePlanPayload(payload);
        const { clientId, trainerId, title, description, frequencyPerWeek, startDate, endDate } = payload;
        await ensureTrainerValidated(trainerId);
        const client = await ClientProfile_1.default.findById(clientId).select('_id userId');
        if (!client) {
            throw (0, http_errors_1.default)(404, 'Cliente não encontrado.');
        }
        const plan = await TrainingPlan_1.default.create({
            clientId,
            trainerId,
            title,
            description,
            frequencyPerWeek,
            startDate,
            endDate,
        });
        // Notify client about new plan
        if (client.userId) {
            const notification = await Notification_1.default.create({
                recipientId: client.userId,
                type: 'NEW_PLAN',
                payload: { planId: plan._id, title: plan.title },
                isRead: false,
            });
            (0, socketServer_1.emitToUser)(String(client.userId), 'notification:new', notification);
        }
        res.status(201).json(plan);
    }
    catch (error) {
        next(error);
    }
};
exports.createPlan = createPlan;
/**
 * Retrieves a training plan by ID.
 *
 * @route GET /api/plans/:id
 * @access Private
 *
 * @param req - Express request with plan ID in params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingPlan} The requested training plan
 * @throws {HttpError} 404 if plan not found
 */
const getPlanById = async (req, res, next) => {
    try {
        const plan = await TrainingPlan_1.default.findById(req.params.id);
        if (!plan) {
            throw (0, http_errors_1.default)(404, 'Plano não encontrado.');
        }
        res.json(plan);
    }
    catch (error) {
        next(error);
    }
};
exports.getPlanById = getPlanById;
/**
 * Updates a training plan.
 *
 * @route PATCH /api/plans/:id
 * @access Private - TRAINER only
 *
 * @param req - Express request with updates in body
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingPlan} The updated training plan
 * @throws {HttpError} 403 if new trainer not validated
 * @throws {HttpError} 404 if plan not found
 */
const updatePlan = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        // Validate new trainer if being changed
        if ('trainerId' in updates && updates.trainerId) {
            await ensureTrainerValidated(String(updates.trainerId));
        }
        const plan = await TrainingPlan_1.default.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (!plan) {
            throw (0, http_errors_1.default)(404, 'Plano não encontrado.');
        }
        res.json(plan);
    }
    catch (error) {
        next(error);
    }
};
exports.updatePlan = updatePlan;
/**
 * Deletes a training plan and its associated sessions.
 *
 * @route DELETE /api/plans/:id
 * @access Private - TRAINER only
 *
 * @param req - Express request with plan ID in params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 404 if plan not found
 */
const deletePlan = async (req, res, next) => {
    try {
        const plan = await TrainingPlan_1.default.findByIdAndDelete(req.params.id);
        if (!plan) {
            throw (0, http_errors_1.default)(404, 'Plano não encontrado.');
        }
        // Cascade delete sessions
        await TrainingSession_1.default.deleteMany({ planId: plan._id });
        res.json({ message: 'Plano removido.' });
    }
    catch (error) {
        next(error);
    }
};
exports.deletePlan = deletePlan;
// ============================================================================
// Training Sessions Endpoints
// ============================================================================
/**
 * Lists training sessions for a plan.
 *
 * @route GET /api/plans/:planId/sessions
 * @access Private
 *
 * @param req - Express request with planId in params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingSession[]} Array of training sessions
 */
const listSessions = async (req, res, next) => {
    try {
        const { planId } = req.params;
        const query = { planId };
        const { dayOfWeek } = req.query;
        if (dayOfWeek) {
            query.dayOfWeek = Number.parseInt(dayOfWeek, 10);
        }
        const sessions = await TrainingSession_1.default.find(query).sort({
            dayOfWeek: 1,
            order: 1,
            createdAt: 1,
        });
        res.json(sessions);
    }
    catch (error) {
        next(error);
    }
};
exports.listSessions = listSessions;
/**
 * Creates a new training session for a plan.
 *
 * @route POST /api/plans/:planId/sessions
 * @access Private - TRAINER only
 *
 * @param req - Express request with session data in body
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingSession} The created session
 * @throws {HttpError} 400 if dayOfWeek missing or too many exercises
 */
const createSession = async (req, res, next) => {
    try {
        const { planId } = req.params;
        const { dayOfWeek, order = 0, notes, exercises = [] } = req.body;
        if (typeof dayOfWeek !== 'number') {
            throw (0, http_errors_1.default)(400, 'dayOfWeek é obrigatório (0-6).');
        }
        if (Array.isArray(exercises) && exercises.length > 10) {
            throw (0, http_errors_1.default)(400, 'Máximo de 10 exercícios por sessão.');
        }
        const session = await TrainingSession_1.default.create({
            planId,
            dayOfWeek,
            order,
            notes,
            exercises,
        });
        res.status(201).json(session);
    }
    catch (error) {
        next(error);
    }
};
exports.createSession = createSession;
/**
 * Retrieves a training session by ID.
 *
 * @route GET /api/sessions/:id
 * @access Private
 *
 * @param req - Express request with session ID in params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingSession} The requested session
 * @throws {HttpError} 404 if session not found
 */
const getSessionById = async (req, res, next) => {
    try {
        const session = await TrainingSession_1.default.findById(req.params.id);
        if (!session) {
            throw (0, http_errors_1.default)(404, 'Sessão não encontrada.');
        }
        res.json(session);
    }
    catch (error) {
        next(error);
    }
};
exports.getSessionById = getSessionById;
/**
 * Updates a training session.
 *
 * @route PATCH /api/sessions/:id
 * @access Private - TRAINER only
 *
 * @param req - Express request with updates in body
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {TrainingSession} The updated session
 * @throws {HttpError} 400 if too many exercises
 * @throws {HttpError} 404 if session not found
 */
const updateSession = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        if (Array.isArray(updates.exercises) && updates.exercises.length > 10) {
            throw (0, http_errors_1.default)(400, 'Máximo de 10 exercícios por sessão.');
        }
        const session = await TrainingSession_1.default.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
        if (!session) {
            throw (0, http_errors_1.default)(404, 'Sessão não encontrada.');
        }
        res.json(session);
    }
    catch (error) {
        next(error);
    }
};
exports.updateSession = updateSession;
/**
 * Deletes a training session.
 *
 * @route DELETE /api/sessions/:id
 * @access Private - TRAINER only
 *
 * @param req - Express request with session ID in params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 404 if session not found
 */
const deleteSession = async (req, res, next) => {
    try {
        const session = await TrainingSession_1.default.findByIdAndDelete(req.params.id);
        if (!session) {
            throw (0, http_errors_1.default)(404, 'Sessão não encontrada.');
        }
        res.json({ message: 'Sessão removida.' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteSession = deleteSession;
// ============================================================================
// Completion Logs Endpoints
// ============================================================================
/**
 * Lists workout completion logs with optional filtering.
 *
 * @route GET /api/completion
 * @access Private
 *
 * @param req - Express request with optional filters (clientId, trainerId, status, from, to)
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {PaginatedResponse<CompletionLog>} Paginated completion logs
 */
const listCompletion = async (req, res, next) => {
    try {
        const { page, limit, skip } = paginate(req, { def: 30, max: 200 });
        const query = {};
        const { clientId, trainerId, status, from, to } = req.query;
        if (clientId)
            query.clientId = clientId;
        if (trainerId)
            query.trainerId = trainerId;
        if (status)
            query.status = status;
        // Date range filter
        if (from || to) {
            const dateFilter = {};
            if (from)
                dateFilter.$gte = new Date(from);
            if (to) {
                // Add 1 day to include completions on the 'to' date itself
                const toDate = new Date(to);
                toDate.setDate(toDate.getDate() + 1);
                dateFilter.$lt = toDate;
            }
            query.date = dateFilter;
        }
        const [items, total] = await Promise.all([
            CompletionLog_1.default.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit),
            CompletionLog_1.default.countDocuments(query),
        ]);
        res.json({ items, page, total, pages: Math.ceil(total / limit) });
    }
    catch (error) {
        next(error);
    }
};
exports.listCompletion = listCompletion;
/**
 * Creates or updates a workout completion log.
 *
 * Notifies the trainer when a client completes or misses a workout.
 *
 * @route POST /api/completion
 * @access Private - CLIENT only
 *
 * @param req - Express request with completion data in body
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns {CompletionLog} The created/updated completion log
 * @throws {HttpError} 400 if required fields missing or invalid status
 */
const upsertCompletion = async (req, res, next) => {
    var _a;
    try {
        const payload = req.body;
        validateCompletionPayload(payload);
        const { clientId, trainerId, planId, sessionId, date, status, reason, proofImage } = payload;
        // Normalize date to UTC midnight for consistent comparison
        const normalizedDate = new Date(date);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        const update = {
            status,
            reason: status === 'MISSED' ? (reason || null) : undefined,
            proofImage: proofImage || undefined,
        };
        const completionLog = await CompletionLog_1.default.findOneAndUpdate({ clientId, sessionId, date: normalizedDate, planId, trainerId }, { $set: update }, { upsert: true, new: true, setDefaultsOnInsert: true });
        // Get client name for notification
        const clientProfile = await ClientProfile_1.default.findById(clientId)
            .populate('userId', 'username profile.firstName profile.lastName');
        const clientUser = clientProfile === null || clientProfile === void 0 ? void 0 : clientProfile.userId;
        const clientName = ((_a = clientUser === null || clientUser === void 0 ? void 0 : clientUser.profile) === null || _a === void 0 ? void 0 : _a.firstName)
            ? `${clientUser.profile.firstName}${clientUser.profile.lastName ? ` ${clientUser.profile.lastName}` : ''}`
            : (clientUser === null || clientUser === void 0 ? void 0 : clientUser.username) || 'Cliente';
        // Notify trainer
        await notifyTrainerOfCompletion(trainerId, status, {
            clientId,
            clientName,
            planId,
            sessionId,
            date: normalizedDate,
        });
        res.status(201).json(completionLog);
    }
    catch (error) {
        next(error);
    }
};
exports.upsertCompletion = upsertCompletion;
/**
 * Deletes a completion log entry.
 *
 * @route DELETE /api/completion/:id
 * @access Private
 *
 * @param req - Express request with completion ID in params
 * @param res - Express response
 * @param next - Express next function
 *
 * @returns Success message
 * @throws {HttpError} 404 if log not found
 */
const deleteCompletion = async (req, res, next) => {
    try {
        const completionLog = await CompletionLog_1.default.findByIdAndDelete(req.params.id);
        if (!completionLog) {
            throw (0, http_errors_1.default)(404, 'Registo não encontrado.');
        }
        res.json({ message: 'Registo removido.' });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteCompletion = deleteCompletion;
