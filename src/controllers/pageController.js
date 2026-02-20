
const Address = require("../models/address");
const productService = require('../services/product');
const categoryService = require('../services/category');
const Product = require('../models/products');
const categoryBanners = require("../data/categoryBanners");
const Cart = require("../models/cart")





const home = async (req, res) => {
    const tag = ["trending", "bestseller", "luxury-beds"];


    const result = await Product.find({
        tags: { $in: tag },
        isDeleted: false
    })
        .limit(30)
        .populate('category', 'name slug')
        .populate({ path: "subcategories", select: "name slug parent level" })
        .populate('subcategories', 'name slug')
        .lean();



    res.render("home", {
        title: "Home",
        msg: req.query.msg,
        products: result || []
    });
};



const shopCollection = async (req, res) => {

    const { category } = req.query;

    const selectedCategory = req.query.category || null;
    const selectedSubcategory = req.query.subcategory || null;

    const filterOptions = category
        ? await productService.getFilterOptions(category)
        : await productService.getFilterOptions();

    res.render("products/shop-collection", {
        title: "Shop Collection",
        msg: req.query.msg,
        filterOptions: filterOptions || {},
        selectedCategory: selectedCategory,
        selectedSubcategory: selectedSubcategory,
    });
}


const shopCollectionBySlug = async (req, res) => {
    try {
        const { categorySlug } = req.params;

        // Get category by slug
        const category = await categoryService.getCategoryBySlug(categorySlug);

        if (!category) {
            return res.status(404).render('404', {
                title: 'Category Not Found',
                message: 'The category you are looking for does not exist'
            });
        }

        // ✅ Get banner for this category slug
        const banner = categoryBanners[categorySlug] || categoryBanners["default"];

        const categoryId = category._id;

        const options = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 20
        };

        const result = await productService.getProductsByCategory(categoryId, options);
        const filterOptions = await productService.getFilterOptions(categoryId);

        return res.render("products/shop-inp-collection", {
            title: `${category.name} Collection`,
            msg: req.query.msg,
            category: category,
            categorySlug: categorySlug,
            bannerImage: banner.image,
            bannerLabel: banner.label,
            products: result.products,
            pagination: result.pagination,
            filterOptions: filterOptions || {},
            selectedCategory: category,
            selectedSubcategory: null,
        });

    } catch (error) {
        console.error('Error in shopCollectionBySlug:', error);
        return res.status(500).render('error', {
            title: 'Error',
            message: 'Failed to load products',
            error: error
        });
    }
};


const shopCollectionBySubcategorySlug = async (req, res) => {
    try {
        const { categorySlug, subcategoryslug } = req.params;

        // 1) Get subcategory under the given parent category slug (SAFE)
        const subcategory = await categoryService.getSubcategoryBySlugAndParent(
            categorySlug,
            subcategoryslug
        );

        if (!subcategory) {
            return res.status(404).render("404", {
                title: "Category Not Found",
                message: "The category/subcategory you are looking for does not exist",
            });
        }

        // parent category (populated by service)
        const parentCategory = subcategory.parent;

        // 2) Banner (based on parent category slug)
        const banner = categoryBanners?.[categorySlug] || categoryBanners?.default || {};

        // 3) Fetch products by subcategory id (since this is subcategory page)
        const subcategoryId = subcategory._id;

        const options = {
            page: Number(req.query.page) || 1,
            limit: Number(req.query.limit) || 20,
        };

        // IMPORTANT: use a method that filters by subcategory
        // If you only have getProductsByCategory, create getProductsBySubcategory.
        const result = await productService.getProductsBySubcategory(subcategoryId, options);


        return res.render("products/shop-inp-collection", {
            title: `${subcategory.name} Collection`,
            msg: req.query.msg,

            // keep both
            category: parentCategory,
            categorySlug,

            bannerImage: banner?.image,
            bannerLabel: banner?.label,

            products: result.products,
            pagination: result.pagination,

            selectedCategory: parentCategory,
            selectedSubcategory: subcategory,
        });
    } catch (error) {
        console.error("Error in shopCollectionBySubcategorySlug:", error);
        return res.status(500).render("error", {
            title: "Error",
            message: "Failed to load products",
            error,
        });
    }
};


const shopproducts = async (req, res) => {
    try {
        const { productSlug } = req.params;

        const product = await productService.getProductBySlug(productSlug);

        if (!product) {
            return res.status(404).render("404", {
                title: "Product Not Found",
                message: "The product you are looking for does not exist",
            });
        }

        let relatedProducts = [];
        try {
            const categoryId = product?.category?._id || product?.category;
            if (categoryId) {
                relatedProducts = await Product.find({
                    _id: { $ne: product._id },
                    category: categoryId,
                    isDeleted: false,
                })
                    .limit(12)
                    .populate("category", "name slug")
                    .lean();
            }
        } catch (e) {
            relatedProducts = [];
        }

        return res.render("products/product", {
            title: product?.name || "Product Details",
            msg: req.query.msg,
            product,
            relatedProducts,
        });
    } catch (error) {
        console.error("Error in shopproducts:", error);
        return res.status(500).render("error", {
            title: "Error",
            message: "Failed to load product",
            error,
        });
    }
};



const cartPage = async (req, res) => {
    try {

        const userId = req.user.id;

        if (!userId) {
            return res.redirect("/login");
        }

        const cart = await Cart.findOne({ userId });

        // If no cart yet → empty cart page
        if (!cart) {
            return res.render("cart", {
                items: [],
                totalItems: 0,
                totalPrice: 0
            });
        }

        // ✔ Send data to EJS
        res.render("cart", {
            items: cart.items,
            totalItems: cart.totalItems,
            totalPrice: cart.totalPrice
        });

    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
};



const checkoutPage = async (req, res) => {
    try {
        const userId = req.user.id;

        const addresses = await Address.find({ user: userId, isActive: true })
            .sort({ createdAt: -1 })
            .lean();

        const cart = await Cart.findOne({ userId })
            .populate("items.productId") // ✅ correct path
            .lean({ virtuals: true });   // so totalItems/totalPrice are available

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.redirect("/cart");
        }

        // return res.status(200).json({
        //     title: "Checkout",
        //     user: req.user,
        //     addresses,
        //     cart,
        // })

        return res.render("checkout", {
            title: "Checkout",
            user: req.user,
            addresses,
            cart,
        });
    } catch (error) {
        console.error("Checkout Page Error:", error);
        // Don't render "error" unless you have error.ejs
        return res.status(500).send("Something went wrong while loading checkout.");
    }
};


const dashboard = async (req, res) => {

    const { slug } = req.query || "user-profile";

    let addressDaata = [];

    if (slug === "user-addresses") {
        const userId = req.user.id;
        addressDaata = await Address.find({ user: userId, isActive: true }).sort({ createdAt: -1 }).lean();
    }

    res.render("usr-dashboard/dashboard", {
        title: "Dashboard",
        pagetobeincluded: slug,
        addressDaata: addressDaata,
        msg: req.query.msg
    });

}


module.exports = { home, dashboard, shopCollection, shopCollectionBySlug, shopCollectionBySubcategorySlug, shopproducts, cartPage, checkoutPage };