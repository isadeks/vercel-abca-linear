# vercel-abca-linear

Wander travel guide site + booking API, deployed on **AWS Amplify**.

## Deployment

This project is hosted on AWS Amplify. The build spec is defined in [`amplify.yml`](./amplify.yml):

- **preBuild**: `npm ci` to install dependencies
- **build**: lint + test gates via `npm run lint` && `npm test`
- **artifacts**: all `.html` files and `api/` directory are deployed

## Development

```bash
npm ci
npm run lint   # ESLint (zero warnings)
npm test       # Vitest unit tests
```
