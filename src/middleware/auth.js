const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;
const { ForbiddenError, UnauthorizedError } = require("../lib/errors");

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // TÄRKEÄÄ: Tarkista header ENNEN split-kutsua
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // Heitetään luokka, jonka errorHandler tunnistaa (status 401)
      throw new UnauthorizedError("Unauthorized");
    }

    // Nyt on turvallista splitata
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      // Jos token on vanhentunut tai feikki, jwt.verify heittää virheen.
      // Voimme heittää ForbiddenErrorin (403)
      throw new ForbiddenError("Invalid or expired token");
    }
  } catch (error) {
    // Tämä vie virheen (oli se Unauthorized tai Forbidden) errorHandleriin
    next(error);
  }
}

module.exports = authenticate;