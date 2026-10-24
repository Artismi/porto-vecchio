// /api/test — la stessa di v7/api/test.js, su Netlify
import handler from '../../v7/api/test.js'
import { daVercel } from '../lib/vercel.mjs'

export default daVercel(handler)
export const config = { path: '/api/test' }
