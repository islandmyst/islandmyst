import React, {useRef,} from 'react';
import {Head, useForm} from '@inertiajs/react';
import Editor from '../Components/Editor/editor.jsx';
import Quill from 'quill'
import StandardLayout from './../Layouts/StandardLayout';
import AttachMediaForm from "../Components/AttachMediaForm.jsx";


/**
 * List item showing a relative that is attached to the story
 * @param relative
 * @param onDetachRelativeClick
 * @returns {JSX.Element}
 * @constructor
 */
function AttachedRelative({relative, onDetachRelativeClick}) {
    return (<li>
        <label>
            {relative.given_name} {relative.surname}
            <button type="button" onClick={onDetachRelativeClick} value={relative.id}
                    className="btn btn-link text-decoration-none">❌
            </button>
        </label>
        <input name="relatives[]" type="hidden" value={relative.id}/>
    </li>)
}

/**
 * List item showing an un-attached relative.
 * @param relative
 * @param onAttachRelativeClick
 * @returns {JSX.Element}
 * @constructor
 */
function FoundRelative({relative, onAttachRelativeClick}) {
    return (<li>
        <label>
            {relative.given_name} {relative.surname}
            <button type="button" onClick={onAttachRelativeClick} value={relative.id}
                    className="btn btn-link text-decoration-none">➕
            </button>
        </label>
    </li>)
}

/**
 * Block showing an image or audio media item.
 * @param mediaItem
 * @param onRemoveMediaItemClick
 * @returns {JSX.Element}
 * @constructor
 */
function MediaItem({mediaItem, onRemoveMediaItemClick}) {
    return <div className="card col-12 col-md-6 col-lg-4 col-lg-3 col-xxl-3 p-2">
        <div className="card-img-top" style={{height: '250px'}}>
            {mediaItem.content_type.startsWith('image/') ?
                <img alt={mediaItem.originalName} className="w-100 h-100 object-fit-contain"
                     src={route('media_items.show', {media_item: mediaItem.id})}
                />
                :
                <audio controls className="w-100">
                    <source src={route('media_items.show', {media_item: mediaItem.id})}/>
                </audio>
            }
        </div>
        <div className="card-body d-flex flex-column gap-3">
            <div className="flex-grow-1">
                <h5 className="card-title">{mediaItem.original_name}</h5>
                <p className="card-text">{mediaItem.content_type}</p>
            </div>
            <div>
                <button type="button" className="btn btn-outline-danger" onClick={onRemoveMediaItemClick}
                        data-media-item-id={mediaItem.id}>Remove
                </button>
            </div>
        </div>
    </div>
}

function Error({error}) {
    return error && <div className="text-danger">{error}</div>
}

export default function StoryEditor({errors, story, availableRelativeNames}) {
    const {data, setData, put, transform} = useForm({
        title: story.title,
        text: story.text,
        mediaItems: story.mediaItems,
        relatives: story.relatives,
        published: story.published,
        public: story.public
    })

    const Delta = Quill.import('delta');
    // Use a ref to access the quill instance directly
    const quillRef = useRef();

    function detachRelative(e) {
        const relativeID = parseInt(e.target.value);
        setData('relatives', data.relatives.filter(relative => relative.id !== relativeID))
    }

    function attachRelative(e) {
        const relativeID = parseInt(e.target.value);
        // Don't attach a relative if they are already attached
        if (data.relatives.map(r => r.id).includes(relativeID)) {
            return;
        }
        setData('relatives', [
            ...data.relatives,
            ...availableRelativeNames.filter(relative => relative.id === relativeID)
        ])
    }

    function attacheMediaToStory(mediaItems) {
        setData('mediaItems', [...data.mediaItems, ...mediaItems])
    }

    function detachMediaItemFromStory(e) {
        const mediaItemId = parseInt(e.target.dataset.mediaItemId)
        setData('mediaItems', data.mediaItems.filter((mediaItem) => mediaItem.id !== mediaItemId))
    }

    // Callback to transform the form data before sending it to the server.
    transform(formData => ({
        ...formData,
        // Convert Media Items objects to an array of IDs
        mediaItems: Object.fromEntries(formData.mediaItems.map(mediaItem => [mediaItem.id, mediaItem.id])),
        // Convert Relative objects to an array of IDs
        relatives: Object.fromEntries(formData.relatives.map(relative => [relative.id, relative.id]))
    }))

    function saveStory(e) {
        e.preventDefault()
        put(route('stories.update', {story: story.id}))
    }

    //const attachedRelativeIDs = data.relatives.map(relative => relative.id)
    const attachedRelativeIDs = data.relatives.map(r => r.id)
    const unattachedRelatives = availableRelativeNames.filter(relative => !attachedRelativeIDs.includes(relative.id))

    return (
        <StandardLayout>
            <Head>
                <title>{"Edit Story: " + data.title}</title>
            </Head>
            <form onSubmit={saveStory}>
                <div className="row">
                    <div className="col-12 d-flex flex-column flex-md-row gap-3 align-items-md-end">
                        <div className="flex-grow-1">
                            <label htmlFor="title" className="form-label">Story Title</label>
                            <input name="title" id="title" type="text" defaultValue={data.title}
                                   onChange={(e) => setData('title', e.target.value)}
                                   className="form-control" min="1" maxLength="100"
                            />
                            <Error error={errors.title}/>
                        </div>
                        <div>
                            <div className="form-check form-switch"
                                 title="Visible to users other than the author and editors">
                                <label htmlFor="published" className="form-check-label">Live</label>
                                <input name="published" id="published" type="checkbox"
                                       defaultChecked={data.published}
                                       onChange={(e) => setData('published', e.target.checked)}
                                       className="form-check-input"
                                />
                                <Error error={errors.published}/>
                            </div>
                            <div className="form-check form-switch" title="Visible to anyone on the internet.">
                                <label htmlFor="public" className="form-check-label">Public</label>
                                <input name="public" id="public" type="checkbox" defaultChecked={data.public}
                                       onChange={(e) => setData('public', e.target.checked)}
                                       className="form-check-input"
                                />
                                <Error error={errors.public}/>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Story Body */}
                <div className="row mt-3">
                    <div className="col-12 form-label">
                        Story Text
                    </div>
                    <Error error={errors.text}/>
                    <div className="col-12">
                        <Editor
                            ref={quillRef}
                            readOnly={false}
                            defaultValue={data.text && data.text.length > 0 && new Delta(JSON.parse(data.text).ops)}
                            onTextChange={() => setData('text', JSON.stringify(quillRef.current.getContents()))}
                        />
                    </div>
                </div>

                {/* Slide Show Media */}
                <div className="mt-3 row g-2">
                    <h4 className="col-12">Slide Show Media</h4>
                    {Object.entries(errors ?? {}).map(([field, message]) => field.startsWith('mediaItems.') &&
                        <div className="text-danger">{message}</div>)}
                    <div className="col-12">
                        <AttachMediaForm onMediaAttached={attacheMediaToStory}/>
                    </div>
                    {data.mediaItems.map((mediaItem) =>
                        <MediaItem key={mediaItem.id} mediaItem={mediaItem}
                                   onRemoveMediaItemClick={detachMediaItemFromStory}/>
                    )}
                </div>

                {/* Relatives */}
                <div className="row mt-3">
                    <h4 className="col-12">Tagged Relatives</h4>
                    {Object.entries(errors ?? {}).map(([field, message]) => field.startsWith('relatives.') &&
                        <div className="text-danger">{message}</div>)}
                    <div className="col-12 col-md-6 col-xl-4">
                        <ul className="empty-list-placeholder">
                            {
                                data.relatives.map((relative) =>
                                    <AttachedRelative key={relative.id}
                                                      relative={relative}
                                                      onDetachRelativeClick={detachRelative}
                                    />
                                )}
                        </ul>
                    </div>
                    <div className="col-12 col-md-6 col-xl-4">
                        <div>
                            <label htmlFor="find_relative" className="form-label">Attach Relatives</label>
                            <input id="find_relative" type="text"
                                   className="form-control" min="1" maxLength="100"
                                   placeholder="Search"
                            />
                        </div>
                        <ul>
                            {unattachedRelatives.map((relative) =>
                                <FoundRelative key={relative.id} relative={relative}
                                               onAttachRelativeClick={attachRelative}/>
                            )}
                        </ul>
                    </div>
                </div>
                {/* Meta Information */}
                <div className="row mt-3">
                    <h4 className="col-12">Statistics</h4>
                    <div className="col-12">
                        <ul>
                            <li>Date Created: {new Date(story.created_at).toLocaleDateString()}</li>
                            <li>Date Modified: {new Date(story.updated_at).toLocaleDateString()}</li>
                        </ul>
                    </div>
                </div>

                <div className="row sticky-bottom py-2 bg-white border-top border-gray">
                    <div className="col-6">
                        <button className="btn btn-danger">Delete</button>
                    </div>
                    <div className="col-6 text-end">
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </div>
            </form>
        </StandardLayout>
    );
}
