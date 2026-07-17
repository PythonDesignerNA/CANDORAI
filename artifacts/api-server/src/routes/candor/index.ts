import { Router, type IRouter } from "express";
import analyzeRouter from "./analyze";
import compareRouter from "./compare";
import importJobRouter from "./import-job";

const router: IRouter = Router();

router.use(analyzeRouter);
router.use(compareRouter);
router.use(importJobRouter);

export default router;
