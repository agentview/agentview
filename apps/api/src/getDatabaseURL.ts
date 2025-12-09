export function getDatabaseURL() {
    if (!process.env.POSTGRES_DB) {
        throw new Error('POSTGRES_DB must be set');
    }

    if (!process.env.POSTGRES_USER) {
        throw new Error('POSTGRES_USER must be set');
    }

    if (!process.env.POSTGRES_PASSWORD) {
        throw new Error('POSTGRES_PASSWORD must be set');
    }

    if (!process.env.POSTGRES_HOST) {
        throw new Error('POSTGRES_HOST must be set');
    }

    if (!process.env.POSTGRES_PORT) {
        throw new Error('POSTGRES_PORT must be set');
    }

    // postgresql://postgres:postgres@localhost:5432/postgres
    return `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
}
