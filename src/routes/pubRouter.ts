import express from "express";
import asyncHandler from "../controllers/helpers/asyncHandler";
import PubController from "../controllers/PubController";

export default function(pubController: PubController): express.Router {
    const router: express.Router = express.Router();

    router.post('/email', pubController.sendEmail());

    return router;
}