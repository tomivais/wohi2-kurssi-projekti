const {resetDb, request, prisma, app} = require("./helpers");
const brypt = require("bcrypt");
beforeEach(resetDb);

it("registers, hashes password & returns token", async () => {

    const res = await request(app).post("/api/auth/register").send({
        email:"a@test.io",
        name:"A",
        password:"123456"
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));

    const user = await prisma.user.findUnique({ where: { email: "a@test.io" } });
    expect(user.password).not.toBe("123456");

    const comparison = await brypt.compare("123456", user.password);
    expect(comparison).toBe(true);

});