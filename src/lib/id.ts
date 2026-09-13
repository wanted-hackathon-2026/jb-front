/** 목 데이터·클라이언트 전용 id. 백엔드 id 와 섞이지 않게 접두사를 붙인다. */
export const localId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`
