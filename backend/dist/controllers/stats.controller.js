"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.myCompletionsByMonth = exports.myCompletionsByWeek = exports.completionsByMonth = exports.completionsByWeek = void 0;
const mongoose_1 = require("mongoose");
const CompletionLog_1 = __importDefault(require("../models/CompletionLog"));
const ClientProfile_1 = __importDefault(require("../models/ClientProfile"));
const TrainerProfile_1 = __importDefault(require("../models/TrainerProfile"));
const parseDate = (value) => {
    if (!value)
        return undefined;
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
};
// ------------------------------
// GENÉRICOS (com query params)
// ------------------------------
// GET /api/stats/completions/weekly?from=...&to=...&clientId=...&trainerId=...
const completionsByWeek = async (req, res, next) => {
    try {
        const { from, to, clientId, trainerId } = req.query;
        const match = { status: 'DONE' };
        const fromDate = parseDate(from);
        const toDate = parseDate(to);
        if (fromDate || toDate) {
            match.date = {};
            if (fromDate)
                match.date.$gte = fromDate;
            if (toDate)
                match.date.$lte = toDate;
        }
        if (clientId)
            match.clientId = new mongoose_1.Types.ObjectId(clientId);
        if (trainerId)
            match.trainerId = new mongoose_1.Types.ObjectId(trainerId);
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        week: { $isoWeek: '$date' },
                    },
                    totalCompletions: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    week: '$_id.week',
                    totalCompletions: 1,
                },
            },
            { $sort: { year: 1, week: 1 } },
        ]);
        res.json(results);
    }
    catch (err) {
        next(err);
    }
};
exports.completionsByWeek = completionsByWeek;
// GET /api/stats/completions/monthly?from=...&to=...&clientId=...&trainerId=...
const completionsByMonth = async (req, res, next) => {
    try {
        const { from, to, clientId, trainerId } = req.query;
        const match = { status: 'DONE' };
        const fromDate = parseDate(from);
        const toDate = parseDate(to);
        if (fromDate || toDate) {
            match.date = {};
            if (fromDate)
                match.date.$gte = fromDate;
            if (toDate)
                match.date.$lte = toDate;
        }
        if (clientId)
            match.clientId = new mongoose_1.Types.ObjectId(clientId);
        if (trainerId)
            match.trainerId = new mongoose_1.Types.ObjectId(trainerId);
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    totalCompletions: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalCompletions: 1,
                },
            },
            { $sort: { year: 1, month: 1 } },
        ]);
        res.json(results);
    }
    catch (err) {
        next(err);
    }
};
exports.completionsByMonth = completionsByMonth;
// ------------------------------
// VERSÕES /my (usa req.user)
// ------------------------------
// GET /api/stats/my/weekly
const myCompletionsByWeek = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const match = { status: 'DONE' };
        if (req.user.role === 'CLIENT') {
            const client = await ClientProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!client)
                return res.json([]); // sem perfil → sem dados
            match.clientId = client._id;
        }
        else if (req.user.role === 'TRAINER') {
            const trainer = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!trainer)
                return res.json([]);
            match.trainerId = trainer._id;
        }
        // ADMIN → vê tudo (sem filtro extra)
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        week: { $isoWeek: '$date' },
                    },
                    totalCompletions: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    week: '$_id.week',
                    totalCompletions: 1,
                },
            },
            { $sort: { year: 1, week: 1 } },
        ]);
        res.json(results);
    }
    catch (err) {
        next(err);
    }
};
exports.myCompletionsByWeek = myCompletionsByWeek;
// GET /api/stats/my/monthly
const myCompletionsByMonth = async (req, res, next) => {
    try {
        if (!req.user)
            return res.status(401).json({ message: 'Não autenticado.' });
        const match = { status: 'DONE' };
        if (req.user.role === 'CLIENT') {
            const client = await ClientProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!client)
                return res.json([]);
            match.clientId = client._id;
        }
        else if (req.user.role === 'TRAINER') {
            const trainer = await TrainerProfile_1.default.findOne({ userId: req.user._id }).select('_id');
            if (!trainer)
                return res.json([]);
            match.trainerId = trainer._id;
        }
        // ADMIN → vê tudo
        const results = await CompletionLog_1.default.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    totalCompletions: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    totalCompletions: 1,
                },
            },
            { $sort: { year: 1, month: 1 } },
        ]);
        res.json(results);
    }
    catch (err) {
        next(err);
    }
};
exports.myCompletionsByMonth = myCompletionsByMonth;
