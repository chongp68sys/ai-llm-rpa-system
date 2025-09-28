import { config } from 'dotenv';
config();

const authModule = await import('./src/auth/AuthService.js');
const authService = authModule.authService;

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJmYzAzYjJlNC03Y2ExLTQzMmItYThkMy0yYzI3ZTdmMTg0Y2UiLCJ1c2VybmFtZSI6InVzZXIxMjMiLCJyb2xlIjoidXNlciIsImlhdCI6MTc1OTAzMzMxMiwiZXhwIjoxNzU5MTE5NzEyLCJhdWQiOiJhcGktdXNlcnMiLCJpc3MiOiJhaS1sbG0tcnBhLXN5c3RlbSJ9.bpptHf9MRXGP2KERzeGDYAS-DDs1WfXVySc6q1niE-8";

try {
  const user = authService.verifyToken(token);
  console.log('Verified user:', JSON.stringify(user, null, 2));
} catch (error) {
  console.log('Auth error:', error.message);
}
