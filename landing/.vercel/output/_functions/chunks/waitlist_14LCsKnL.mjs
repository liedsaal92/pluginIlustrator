import { Resend } from 'resend';

const prerender = false;
const resend = new Resend("re_5j3UpC3W_4Q9mLVymtgTkHhHAQmbrYd29");
const audienceId = "0f5c3db9-364c-4ad0-933d-ea76ff4878e9";
const POST = async ({ request }) => {
  const body = await request.json();
  const email = (body.email ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ error: "Email inválido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
  const { error } = await resend.contacts.create({
    email,
    audienceId,
    unsubscribed: false
  });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
