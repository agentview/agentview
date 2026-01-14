export type ProdEnv = {
    type: 'prod'
}

export type DevEnv = {
    type: 'dev',
    memberId: string
}

export type Env = ProdEnv | DevEnv;
