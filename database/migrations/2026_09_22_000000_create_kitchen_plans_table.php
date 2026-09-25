<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kitchen_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name', 120);
            $table->json('room');
            $table->json('items');
            $table->json('settings');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kitchen_plans');
    }
};
