import { Pool } from "pg";

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: '2007',
    port: 5432,
});

(async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log('Подключение к PostgreSQL установлено');
    } catch (error) {
        console.error('Ошибка подключения к PostgreSQL:', error);
    }
})();

export async function checkProductExists(article: string) {
    const res = await pool.query('SELECT 1 FROM products WHERE article = $1', [article]);
    return res.rowCount ?? 0 > 0;
}

export async function updateProduct(article: string, quantity: number, price: number) {
    await pool.query(
        `UPDATE products 
         SET quantity = $1, price = $2 
         WHERE article = $3`,
        [quantity, price, article]
    );
}

export async function addProduct(
    article: string,
    brand: string,
    name: string,
    quantity: number,
    price: number,
    category: string
) {
    await pool.query(
        `INSERT INTO products (article, brand, name, quantity, price, category) VALUES ($1, $2, $3, $4, $5, $6)`,
        [article, brand, name, quantity, price, category]
    );
}

export async function getProductCount() {
    const res = await pool.query('SELECT COUNT(*) FROM products');
    return res.rows[0].count;
}

export default pool;