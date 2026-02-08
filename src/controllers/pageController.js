
const Address = require("../models/address");


const home = (req, res) => res.render("home", { title: "Home", msg: req.query.msg });



const dashboard = async(req, res) => {

    const { slug } = req.query || "user-profile";

    let addressDaata = [];

    if ( slug === "user-addresses" ) {
        const userId = req.user.id;
        addressDaata = await Address.find({ user: userId, isActive: true }).sort({ createdAt: -1 }).lean();
    }

   
    res.render("usr-dashboard/dashboard", {
        title: "Dashboard",
        pagetobeincluded: slug,
        addressDaata : addressDaata ,
        msg: req.query.msg
    });

}


module.exports = { home, dashboard };