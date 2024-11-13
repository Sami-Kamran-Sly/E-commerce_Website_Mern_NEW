import express from "express";
import { isAdmin, requireSignIn } from "../middleware/auth.js";

const router = express.Router();

import {
  CreateProducts,
  UpdateProduct,
  getAllProducts,
  getProduct,
  DeleteProduct,
  productPhotoContrller,
  productFilter,
  productCounter,
  productList,
  ProductSearch,
  relatedProduct,
  braintreePaymentController,
  braintreeTokenController,
} from "../controller/createProduct.js";

import formidable from "express-formidable";

// Public routes
router
  .route("/create-product")
  .post(requireSignIn, isAdmin, formidable(), CreateProducts);

router
  .route("/update-product/:id")
  .put(requireSignIn, isAdmin, formidable(), UpdateProduct);

router.route("/getAll-products").get(getAllProducts);

// Admin-protected routes
router.route("/getsingle-product/:slug").get(getProduct);

router
  .route("/delete-product/:id")
  .delete(requireSignIn, isAdmin, DeleteProduct);

router.get("/product-photo/:pid", productPhotoContrller);
router.post("/product-filter", productFilter);

// filter Product

router.get("/product-count", productCounter);

router.get("/product-list/:page", productList);

router.get("/search/:keyword", ProductSearch);
router.get("/related-product/:pid/:cid", relatedProduct);

router.get("/braintree/token", braintreeTokenController);

router.post("/braintree/payment", requireSignIn, braintreePaymentController);

export default router;
