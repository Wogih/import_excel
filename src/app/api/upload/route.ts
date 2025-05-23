import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import pool, {addProduct, checkProductExists, getProductCount, updateProduct} from '@/lib/db';

interface ExcelProduct {
    'Артикул'?: unknown;
    'Бренд'?: unknown;
    'Наименование'?: unknown;
    'Доступно'?: unknown;
    'Опт1'?: unknown;
    'Категория'?: unknown;
}

interface ProcessResult {
    success: boolean;
    stats: {
        totalInFile: number;
        inserted: number;
        updated: number;
        errors: number;
        totalInDB: number;
    };
    message: string;
    sampleErrors?: string[];
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as Blob | null;

        if (!file) {
            return NextResponse.json(
                { error: 'Файл не был загружен' },
                { status: 400 }
            );
        }

        if (file.size > 10 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'Файл слишком большой. Максимальный размер: 10MB' },
                { status: 400 }
            );
        }

        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer);
        const sheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json<ExcelProduct>(workbook.Sheets[sheetName]);

        if (!jsonData || jsonData.length === 0) {
            return NextResponse.json(
                { error: 'Файл не содержит данных или имеет неверную структуру' },
                { status: 400 }
            );
        }

        const client = await pool.connect();
        let insertedCount = 0;
        let updatedCount = 0;
        const errors: string[] = [];

        try {
            await client.query('BEGIN');

            for (const [index, row] of jsonData.entries()) {
                try {
                    const article = row['Артикул']?.toString().trim();
                    const brand = row['Бренд']?.toString().trim();
                    const name = row['Наименование']?.toString().trim();
                    const quantity = Number(row['Доступно']);
                    const price = Number(row['Опт1']);
                    const category = row['Категория']?.toString().trim() || 'Без категории';

                    // Валидация данных
                    if (!article || !brand || !name) {
                        errors.push(`Строка ${index + 2}: Обязательные поля отсутствуют`);
                        continue;
                    }

                    if (isNaN(quantity) || quantity < 0) {
                        errors.push(`Строка ${index + 2}: Некорректное количество`);
                        continue;
                    }

                    if (isNaN(price) || price <= 0) {
                        errors.push(`Строка ${index + 2}: Некорректная цена`);
                        continue;
                    }

                    const exists = await checkProductExists(article);

                    if (exists) {
                        await updateProduct(article, quantity, price);
                        updatedCount++;
                    } else {
                        await addProduct(article, brand, name, quantity, price, category);
                        insertedCount++;
                    }

                } catch (error) {
                    errors.push(`Строка ${index + 2}: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
                }
            }

            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Transaction error:', error);
            return NextResponse.json(
                {
                    error: 'Ошибка транзакции',
                    details: error instanceof Error ? error.message : 'Неизвестная ошибка'
                },
                { status: 500 }
            );
        } finally {
            client.release();
        }

        const totalCount = await getProductCount();
        const result: ProcessResult = {
            success: true,
            stats: {
                totalInFile: jsonData.length,
                inserted: insertedCount,
                updated: updatedCount,
                errors: errors.length,
                totalInDB: totalCount,
            },
            message: `Обработано ${jsonData.length} строк. Добавлено: ${insertedCount}, Обновлено: ${updatedCount}`,
            ...(errors.length > 0 && { sampleErrors: errors }),
        };

        return NextResponse.json(result);
    } catch (error) {
        console.error('Ошибка обработки файла:', error);
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        );
    }
}