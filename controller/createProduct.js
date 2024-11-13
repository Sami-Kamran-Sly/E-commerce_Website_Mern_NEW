import slugify from "slugify";
import { NotFoundError } from "../errors/not-found.js";
import asyncWrapper from "../middleware/async.js";
import ProductModel from "../model/ProductModel.js";

import fs from "fs";
import userModel from "../model/userModel.js";
import { hashedPassword } from "../helper/hashPassword.js";
import braintree from "braintree";

import dotenv from "dotenv";
import orderModel from "../model/orderModel.js";

dotenv.config();
// payment GateWay
var gateway = new braintree.BraintreeGateway({
  environment: braintree.Environment.Sandbox,
  merchantId: process.env.BRAINTREE_MERCHANT_ID,
  publicKey: process.env.BRAINTREE_PUBLIC_KEY,
  privateKey: process.env.BRAINTREE_PRIVATE_KEY,
});
export const CreateProducts = asyncWrapper(async (req, res) => {
  try {
    const { name, description, price, category, quantity, shipping } =
      req.fields;
    const { photo } = req.files;

    if (!name) throw new NotFoundError("Name is Required");
    if (!description) throw new NotFoundError("Description is Required");
    if (!price) throw new NotFoundError("Price is Required");
    if (!category) throw new NotFoundError("Category is Required");
    if (!quantity) throw new NotFoundError("Quantity is Required");
    if (!photo || photo.size > 1000000) {
      return res
        .status(400)
        .send({ error: "Photo is Required and should be less than 1MB" });
    }

    const product = new ProductModel({
      ...req.fields,
      slug: slugify(name),
    });

    if (photo) {
      product.photo.data = fs.readFileSync(photo.path);
      product.photo.contentType = photo.type;
    }

    await product.save();

    res.status(200).send({
      success: true,
      message: "Product Created Successfully",

      product,
    });
  } catch (error) {
    console.error("Error in CreateProducts:", error); // Log detailed error
    res.status(500).send({ error: error.message || "Internal Server Error" });
  }
});

// export const CreateProducts = asyncWrapper(async (req, res) => {
//   const { name, description, price, category, quantity, shipping } = req.fields;
//   const { photo } = req.files;

//   if (!name) {
//     throw new NotFoundError("Name is Required");
//   }

//   if (!description) {
//     throw new NotFoundError("Description is Required");
//   }

//   if (!price) {
//     throw new NotFoundError("Price is Required");
//   }

//   if (!category) {
//     throw new NotFoundError("Category is Required");
//   }

//   if (!quantity) {
//     throw new NotFoundError("Quantity is Required");
//   }

//   if (!photo || photo.size > 1000000) {
//     // Ensure photo size check is correct
//     return res
//       .status(400) // 400 Bad Request is more appropriate for invalid input
//       .send({ error: "Photo is Required and should be less than 1MB" });
//   }
//   const product = await ProductModel.create({
//     ...req.fields,
//     slug: slugify(name),
//   });

//   if (photo) {
//     product.photo.data = fs.readFileSync(photo.path);
//     product.photo.contentType = photo.type;
//   }

//   // This line should save the updated product with the photo data
//   await product.save();

//   res.status(200).send({
//     success: true,
//     message: "Product Created Successfully",
//     product, // Return the created product
//   });
// });

export const getAllProducts = asyncWrapper(async (req, res) => {
  const products = await ProductModel.find({})
    .select("-photo")
    .populate("category")
    .limit(12)
    .sort({ createdAt: -1 });

  res.status(200).send({
    success: true,
    countTotal: products.length,
    message: "All Products",
    products,
  });
});

export const DeleteProduct = asyncWrapper(async (req, res) => {
  const { id } = req.params;

  const products = await ProductModel.findByIdAndDelete(id);

  res.status(200).send({
    success: true,
    message: " Deleting the product successfully  ",
    products,
  });
});

export const getProduct = asyncWrapper(async (req, res) => {
  const { slug } = req.params;

  const product = await ProductModel.findOne({ slug })
    .populate("category")
    .select("-photo");

  res.status(200).send({
    success: true,
    message: " Single the  Product Fetched  ",
    product,
  });
});

export const UpdateProduct = asyncWrapper(async (req, res) => {
  const { name, description, price, category, quantity, shipping } = req.fields;
  const { photo } = req.files; // It should be req.files, not req.fields

  // Validation
  switch (true) {
    case !name:
      return res.status(500).send({ error: "Name is Required" });
    case !description:
      return res.status(500).send({ error: "Description is Required" });
    case !price:
      return res.status(500).send({ error: "Price is Required" });
    case !category:
      return res.status(500).send({ error: "Category is Required" });
    case !quantity:
      return res.status(500).send({ error: "Quantity is Required" });
    case photo && photo.size > 1000000:
      return res
        .status(500)
        .send({ error: "Photo is Required and should be less than 1MB" });
  }

  // Log `req.files` to debug

  const product = await ProductModel.findByIdAndUpdate(
    req.params.id,
    { ...req.fields, slug: slugify(name) },
    { new: true }
  );

  // Check if photo exists before accessing its properties
  if (photo) {
    product.photo.data = fs.readFileSync(photo.path);
    product.photo.contentType = photo.type;
  }

  await product.save();

  res.status(201).send({
    success: true,
    message: "Product Updated Successfully",
    product,
  });
});

export const productPhotoContrller = async (req, res) => {
  try {
    const product = await ProductModel.findById(req.params.pid).select("photo");

    if (product) {
      res.set("Content-Type", product.photo.contentType);
      return res.send(product.photo.data);
    }
  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Error IN Getting  Photo  ",
      error,
    });
  }
};

export const productFilter = asyncWrapper(async (req, res) => {
  const { checked, radio } = req.body;
  const args = {};
  if (checked.length > 0) args.category = checked;
  
  if (radio.length) args.price = { $gte: radio[0], $lte: radio[1] };
// const args={}  if(checked.length>0) arg.category = checked 
  try {
    const products = await ProductModel.find(args);
    res.status(201).send({
      success: true,
      products,
    });
  } catch (error) {
    console.error("Error filtering products:", error); // Log the error properly
    res.status(400).send({
      success: false,
      message: "Error in filtering the products",
    });
  }
});

export const productCounter = asyncWrapper(async (req, res) => {
  const total = await ProductModel.estimatedDocumentCount(); // Simplified count

  res.status(200).send({
    success: true,
    total,
  });
});

export const productList = asyncWrapper(async (req, res) => {
  const perPage = 3; // Number of products per page
  const page = parseInt(req.query.page) || 1; // Ensure page is a number and handle default

  // Find products, excluding the 'photo' field, and applying pagination
  const products = await ProductModel.find({})
    .select("-photo") // Exclude 'photo' field from results
    .skip((page - 1) * perPage) // Skip products of previous pages
    .limit(perPage) // Limit the number of products returned
    .sort({ createdAt: -1 }); // Sort by creation date in descending order

  // Count the total number of products in the collection
  const totalProduct = await ProductModel.countDocuments();

  // Calculate the total number of pages required
  const totalPages = Math.ceil(totalProduct / perPage);

  // Generate an array of page numbers for pagination
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  // Send response with the paginated products and additional pagination info
  res.status(200).json({
    success: true,
    products,
    totalPages,
    currentPage: page,
    pageNumbers,
  });
});

export const ProductSearch = asyncWrapper(async (req, res) => {
  const { keyword } = req.params;

  if (!keyword) {
    return res
      .status(400)
      .json({ success: false, message: "Keyword is required." });
  }

  const result = await ProductModel.find({
    $or: [
      { name: { $regex: keyword, $options: "i" } }, // Corrected to 'options'
      { description: { $regex: keyword, $options: "i" } },
    ],
  }).select("-photo");

  res.json(result);
});

export const relatedProduct = asyncWrapper(async (req, res) => {
  const { pid, cid } = req.params;

  const products = await ProductModel.find({
    category: cid,
    _id: { $ne: pid },
  })
    .select("-photo")
    .limit(4)
    .populate("category");
  res.status(200).send({
    success: true,
    products,
  });
});

export const braintreeTokenController = asyncWrapper(async (req, res) => {
  try {
    // Generate client token
    const response = await gateway.clientToken.generate({});
    res.status(200).send(response);
  } catch (error) {
    // Handle errors
    res.status(500).send(error);
  }
});

export const braintreePaymentController = async (req, res) => {
  try {
    const { nonce, cart } = req.body;
    let total = 0;

    // Calculate total amount
    cart.forEach((item) => {
      total += item.price;
    });

    // Create new transaction
    const result = await gateway.transaction.sale({
      amount: total,
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true,
      },
    });

    if (result.success) {
      // Save order to database
      const order = await new orderModel({
        products: cart,
        payment: result,
        buyer: req.user._id,
      }).save();
      res.json({ ok: true });
    } else {
      // Handle transaction failure
      res.status(500).send(result.message);
    }
  } catch (error) {
    // Handle other errors
    console.log(error);
    res.status(500).send(error.message);
  }
};
