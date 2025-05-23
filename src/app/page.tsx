'use client';
import { useDropzone } from 'react-dropzone';
import { MdCloudUpload, MdCancel } from "react-icons/md";
import { useState } from "react";

interface StatusState {
    loading: boolean;
    progress: number;
    message: string;
    result?: {
        totalInFile: number;
        inserted: number;
        updated: number;
        errors: number;
        totalInDB: number;
        sampleErrors?: string[];
    };
    error?: string;
}

export default function Home() {

    const [status, setStatus] = useState<StatusState>({
        loading: false,
        progress: 0,
        message: '',
    });

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
        maxFiles: 1,
        onDrop: async (acceptedFiles) => {
            if (acceptedFiles.length === 0) return;
            await handleUpload(acceptedFiles[0]);
        },
    });

    const handleUpload = async (file: File) => {
        setStatus({
            loading: true,
            progress: 0,
            message: 'Начало загрузки...',
        });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                setStatus({
                    loading: false,
                    progress: 0,
                    message: 'Ошибка при обработке файла',
                    error: data.error || 'Неизвестная ошибка сервера',
                });
                return;
            }

            console.log(data.sampleErrors);

            setStatus({
                loading: false,
                progress: 100,
                message: data.message,
                result: {
                    ...data.stats,
                    sampleErrors: data.sampleErrors
                },
            });
        } catch (error) {
            setStatus({
                loading: false,
                progress: 0,
                message: 'Ошибка при обработке файла',
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
            });
        }
    };

  return (
      <div className="container mx-auto px-4 py-8 text-black">
          <h1 className="text-2xl font-bold mb-6">Импорт товаров из Excel</h1>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
              >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center justify-center space-y-2">
                      <MdCloudUpload size={40} color="#7d7d7d"/>

                      <p className="text-sm text-gray-600">
                          {isDragActive ? (
                              <span className="text-blue-600">Отпустите файл для загрузки</span>
                          ) : (
                              <>
                                  <span className="font-medium text-blue-600">Нажмите для выбора файла</span>
                                  <span> или перетащите его сюда</span>
                              </>
                          )}
                      </p>
                      <p className="text-xs text-gray-600">Поддерживаются файлы Excel (.xlsx, .xls)</p>
                  </div>
              </div>

              {status.loading && (
                  <div className="mt-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Прогресс: {status.progress}%</span>
                          <span>{status.message}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{width: `${status.progress}%`}}
                          />
                      </div>
                  </div>
              )}
          </div>

          {status.error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                  <div className="flex">
                      <div className="flex-shrink-0">
                          <MdCancel size={30} color="red"/>
                      </div>
                      <div className="ml-3">
                          <p className="text-sm text-red-700">{status.error}</p>
                      </div>
                  </div>
              </div>
          )}

          {status.result && (
              <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-xl font-semibold mb-4">Результаты импорта</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="bg-green-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-green-800">Добавлено новых товаров:</p>
                          <p className="text-2xl font-bold text-green-600">{status.result.inserted}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-blue-800">Обновлено существующих:</p>
                          <p className="text-2xl font-bold text-blue-600">{status.result.updated}</p>
                      </div>
                      <div className="bg-yellow-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-yellow-800">Ошибок обработки:</p>
                          <p className="text-2xl font-bold text-yellow-600">{status.result.errors}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                          <p className="text-sm font-medium text-gray-800">Всего товаров в базе:</p>
                          <p className="text-2xl font-bold text-gray-600">{status.result.totalInDB}</p>
                      </div>
                  </div>

                  {status.result.sampleErrors && (
                      <div className="mt-6 border-t pt-4">
                          <h3 className="text-md font-medium text-red-600 mb-3">
                              Ошибки обработки ({status.result.errors} всего)
                          </h3>
                          <div className={`bg-red-50 rounded-lg p-3 custom-scrollbar ${
                              status.result.sampleErrors.length > 5 ? 'max-h-[150px] overflow-y-auto' : ''
                          }`}>
                              <ul className="list-disc pl-5 mt-1">
                                  {status.result.sampleErrors.map((error, index) => (
                                      <li key={index} className="flex items-start">
                                          <span className="text-sm text-red-700">{error}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      </div>
                  )}
              </div>
          )}

          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-semibold mb-4">Инструкция по импорту</h2>
              <div className="prose prose-sm max-w-none">
                  <ol className="list-decimal pl-5 space-y-2">
                      <li>Подготовьте файл Excel с данными товаров</li>
                      <li>Обязательные колонки:
                          <ul className="list-disc pl-5 mt-1">
                              <li>Артикул</li>
                              <li>Бренд</li>
                              <li>Наименование</li>
                              <li>Доступно</li>
                              <li>Опт1</li>
                              <li>Категория</li>
                          </ul>
                      </li>
                      <li>Первая строка должна содержать заголовки колонок</li>
                      <li>Максимальный размер файла: 10MB</li>
                  </ol>
              </div>
          </div>
      </div>

  );
}
