const {resetDb, registerAndLogin, request, app, prisma} = require("./helpers");

beforeEach(resetDb);

describe("quiz tests",() => {
it("return 401 without token", async () => {
    const res = await request(app).get("/api/questions");
    expect(res.status).toBe(401);
});

it ("returns 404 for unknown post", async () => {
    const token = await registerAndLogin();
    const res = await request(app).get("/api/questions/999").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Quiz not found");
});

it ("ruturns 400 for invalid quiz  body ", async () => {
    const token = await registerAndLogin();
    const res = await request(app).post("/api/questions").set("Authorization", `Bearer ${token}`)
    .send({question: ""});

    expect(res.status).toBe(400);
});

});