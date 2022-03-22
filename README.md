This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, update the (.env.local) with your own purestake API-KEY, and Firebase config info

```bash
NEXT_PUBLIC_PURESTAKE_API=
NEXT_PUBLIC_FIREBASE_APIKEY=
NEXT_PUBLIC_FIREBASE_AUTHDOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECTID=
NEXT_PUBLIC_FIREBASE_STOREAGEBUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID=
NEXT_PUBLIC_FIREBASE_APPID=
NEXT_PUBLIC_FIREBASE_MEASURMENTID=
TESTACCOUNT_MENMONIC=
```

Setup Firebase Realtime Database,

And follow instructions on [https://firebase.google.com/] on how to create Realtime Database

Create the database with this structure
![Screenshot Firebase database](/firebase_example/firebasedb.jpg)

Import the json files in (/firebase_example) to your firebase Realtime database

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
