<?php

namespace Tests\Feature;

use App\Models\MediaItem;
use App\Models\Role;
use App\Models\User;
use App\Roles;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class MediaItemTest extends TestCase
{
    public function testCreate(): void
    {
        // No excess routes
        $this->assertFalse(Route::has('media_items.create'));
        $this->assertFalse(Route::has('media_items.update'));
        $this->assertFalse(Route::has('media_items.index'));
        $this->assertFalse(Route::has('media_items.edit'));
        $this->assertFalse(Route::has('media_items.destroy'));

        // Unauthenticated users can't create
        $response = $this->post(route('media_items.store'));
        $response->assertRedirect(\route('login'));

        // Unauthorized users can't create
        $user = User::factory()->createOne();
        Auth::setUser($user);
        $response = $this->post(route('media_items.store'));
        $response->assertForbidden();

        // Authorize user to upload files
        $user->roles()->sync([
            Role::id(Roles::NoviceContentProvider)
        ]);
        $user->refresh();

        // Input validation
        $response = $this->post(route('media_items.store'));
        $response->assertRedirect();
        $response->assertSessionHasErrors('files');

        $response = $this->post(route('media_items.store'), [
            'files' => [UploadedFile::fake()->create('foobar.txt', '1', 'text/plain')]
        ]);
        $response->assertRedirect();
        $response->assertSessionHasErrors('files.0');

        $response = $this->post(route('media_items.store'), [
            'files' => [UploadedFile::fake()->image('foobar.jpg')]
        ]);
        $response->assertSuccessful();
        $response->assertJson(['status' => 'success']);
        $json = $response->json();
        $this->assertIsInt($json['data'][0]['id']);
        $this->assertNotEmpty(MediaItem::find($json['data'][0]['id']));

        $response = $this->get($json['data'][0]['url']);
        $response->assertHeader('Content-Type', 'image/jpeg');

        // Authentication
        Auth::logout();
        $response = $this->get($json['data'][0]['url']);
        $response->assertRedirect(\route('login'));
    }
}
