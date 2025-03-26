#include "system.h"
#include "work_queue.h"
#include "serial.h"
#include "bm1397.h"
#include <string.h>
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include <esp_timer.h> // For precise timing

static const char *TAG = "ASIC_task";

void ASIC_task(void *pvParameters)
{
    GlobalState *GLOBAL_STATE = (GlobalState *)pvParameters;

    // Initialize the semaphore
    GLOBAL_STATE->ASIC_TASK_MODULE.semaphore = xSemaphoreCreateBinary();

    GLOBAL_STATE->ASIC_TASK_MODULE.active_jobs = malloc(sizeof(bm_job *) * 128);
    GLOBAL_STATE->valid_jobs = malloc(sizeof(uint8_t) * 128);
    for (int i = 0; i < 128; i++)
    {
        GLOBAL_STATE->ASIC_TASK_MODULE.active_jobs[i] = NULL;
        GLOBAL_STATE->valid_jobs[i] = 0;
    }

    ESP_LOGI(TAG, "ASIC Job Interval: %.2f ms", GLOBAL_STATE->asic_job_frequency_ms);
    SYSTEM_notify_mining_started(GLOBAL_STATE);
    ESP_LOGI(TAG, "ASIC Ready!");

    while (1)
    {
        bm_job *next_bm_job = (bm_job *)queue_dequeue(&GLOBAL_STATE->ASIC_jobs_queue);

        if (next_bm_job == NULL) {
            // No work available, delay briefly and continue
            vTaskDelay(1 / portTICK_PERIOD_MS);
            continue;
        }

        if (next_bm_job->pool_diff != GLOBAL_STATE->stratum_difficulty)
        {
            ESP_LOGI(TAG, "New pool difficulty %lu", next_bm_job->pool_diff);
            GLOBAL_STATE->stratum_difficulty = next_bm_job->pool_diff;
        }

        // Send the job to the ASIC
        (*GLOBAL_STATE->ASIC_functions.send_work_fn)(GLOBAL_STATE, next_bm_job);

        // Calculate nonces processed incrementally
        double hash_rate_hps = GLOBAL_STATE->SYSTEM_MODULE.current_hashrate * 1e12; // Hashes per second (TH/s to H/s)
        uint64_t start_time = esp_timer_get_time() / 1000; // Start time in ms
        uint64_t end_time = start_time + (uint64_t)GLOBAL_STATE->asic_job_frequency_ms; // End time in ms

        // Wait for ASIC to finish the job, updating nonces incrementally
        while (esp_timer_get_time() / 1000 < end_time)
        {
            uint64_t current_time = esp_timer_get_time() / 1000; // Current time in ms
            double elapsed_s = (current_time - start_time) / 1000.0; // Elapsed time in seconds
            uint64_t nonces_processed = (uint64_t)(hash_rate_hps * elapsed_s); // Nonces processed so far

            // Update nonces_attempted, capping at 2³²
            GLOBAL_STATE->nonces_attempted = (nonces_processed > 0xFFFFFFFF) ? 0xFFFFFFFF : nonces_processed;

            // Small delay to avoid tight loop, adjust as needed
            vTaskDelay(10 / portTICK_PERIOD_MS); // 10 ms granularity
        }

        // Ensure final update at job end
        double total_elapsed_s = GLOBAL_STATE->asic_job_frequency_ms / 1000.0;
        GLOBAL_STATE->nonces_attempted = (uint64_t)(hash_rate_hps * total_elapsed_s);
        if (GLOBAL_STATE->nonces_attempted > 0xFFFFFFFF) {
            GLOBAL_STATE->nonces_attempted = 0xFFFFFFFF;
        }

        // Wait for ASIC to signal completion
        xSemaphoreTake(GLOBAL_STATE->ASIC_TASK_MODULE.semaphore, 
                       (GLOBAL_STATE->asic_job_frequency_ms / portTICK_PERIOD_MS));

        ESP_LOGI(TAG, "Job completed, nonces_attempted: %llu", GLOBAL_STATE->nonces_attempted);
    }
}
