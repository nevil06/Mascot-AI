async function test() {
  const query = "okay what is your evaluation and how much are you funded";
  const res = await fetch('http://localhost:3001/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: query, companyId: 'carbondot' }),
  });
  const data = await res.json();
  console.log("QUERY:", query);
  console.log("RESPONSE:", JSON.stringify(data, null, 2));
  process.exit(0);
}
test();
