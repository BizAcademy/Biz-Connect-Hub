import { Router, type IRouter } from "express";
import healthRouter from "./health";
import leadsRouter from "./leads";
import adminRouter from "./admin";
import contentRouter from "./content";
import notificationsRouter from "./notifications";
import siteItemsRouter from "./siteItems";
import mediaRouter from "./media";

const router: IRouter = Router();

router.use(healthRouter);
router.use(leadsRouter);
router.use(adminRouter);
router.use(contentRouter);
router.use(notificationsRouter);
router.use(siteItemsRouter);
router.use(mediaRouter);

export default router;
