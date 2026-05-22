import { Router, type IRouter } from "express";
import healthRouter from "./health";
import meRouter from "./me";
import adminRouter from "./admin";
import authRouter from "./auth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(adminRouter);

export default router;
