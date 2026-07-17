import { Router, type IRouter } from "express";
import healthRouter from "./health";
import candorRouter from "./candor";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/candor", candorRouter);

export default router;
