# Decisions

## Scope

Implemented: view and edit a workflow (add a node, connect handles, delete a node, delete an edge, rename, drag), connection rules, in-memory save, load, list, and delete, full-graph validation, a valid or invalid status, and the failure states in the toolbar.

## Frontend and backend

The backend owns the stored document and the full validation. The frontend keeps the React Flow canvas and autosaves the document. Given the small number of users on the platform this seemed a good trade off as it would catch direct api interaction, full validation in the frontend felt risky due to drift.

## Saving an invalid workflow

An invalid workflow can be saved. Status is `valid` only when validation reports nothing. An error or a warning makes the status `invalid`. This allows user to brainstorm while tracking our side if what they produce is "runnable".

## What error and warning mean

An error is something the editor should not have been able to create, and a valid workflow cannot be made without undoing it. A warning is something likely to come up while a workflow is being built, and a valid workflow can be made by adding to it.

## Issue text

Each issue has two messages. The message the API returns uses the labels on the canvas. The message written to the log uses ids.

## When validation runs

Create, replace, and read each return the document with its validation. There is no separate validate call. The mark beside the title shows that result.

While a connection is dragged, the canvas refuses a loop, mismatched handle types, and a second connection into the same input. A node connected to itself is a loop. These are lightweight quality of life checks, and they have to stay in step with the same checks on the server. See next steps for unifying with the backend.

## Node definitions

`DataSource`, `Transform`, and `Model` and their handles are hard-coded in the backend catalog. The frontend keeps the same shapes for nodes it creates. 

## Dropping Any

I decided to drop the `Any` type as none of the three node types used it, and a wildcard would need its own compatibility rules. That seemed a valid trade off given the time restraints. I wanted to focus more on the frontend, and would want to understand the picture fully before adding a type that connects to everything.

## Layout

Node positions are saved with the workflow. They are important to user experience and allows a consistent mental map of what is going on.

## What a save sends

A save replaces the whole workflow. The server assigns the workflow id and the status. The browser assigns node ids and edge ids. Due to the timing of this exercise this seemed like a good trade off. Depending on how large these workflows get, changing to a partial update method might be worth implementing or for multiple users - see next steps.  

## Running a workflow

This app does not run a workflow. A later service would take a workflow whose status is `valid` and copy it. That copy can already be stale. See next steps for dealing with this.

## Extra graph rules

Open required inputs and open required outputs are warnings. A Dataset output is required, on a DataSource and on a Transform, so it has to be connected.

A loop, including a node connected to itself, duplicate ids, a missing node or handle, a connection in the wrong direction, incompatible types, and a second connection into one input are errors.

## Handle types

A connection is legal only when both handles have the same type. The types are `Dataset` and `Model`.

## Handle labels

A handle label is a name the user can edit. The handle id, type, and required flag stay fixed.

## Concurrent updates

The latest save wins. There is no revision. The browser sends saves one after another and ignores a response that belongs to an older edit. As this is a single user and not production ready this seemed a valid trade off with time constraints.

## Persistence

Workflows live in memory until the API process stops. Restarting the API clears them. One example pipeline is loaded at startup. The repository is the boundary a later store would use.

## Type alignment

TypeScript types and Zod schemas are generated from the Pydantic models, through the OpenAPI document. The Python service is the only full validator. See next steps.

## Users

There is one local user and no authentication.

## Failed requests

A missing workflow returns 404. Badly shaped JSON returns 422 and is not stored.

## When the editor saves

Edits save immediately. Dragging a node waits briefly, then saves.

## Next steps

- Unifying validation: I didn't want to have multiple sources of truth for validation and would like to generate a validator for the frontend in a similar way to the type and schema. This seemed out of scope at this point.
- Mark as ready: I have left a "paper trail" of validitiy for future iterations. Not knowing where these workflows will end up / fit into the wider system would have to be understood before further work. I would suspect a "Mark as Ready" feature where all edits for a workflow are locked so it can be used elsewhere would fit the bill. 
- Multiple users: This is a single user application and things would have to be modified if multiple users could edit the same workflow i.e. feedback on when the current workflow has been changed, what the rules would be if multiple edits are happening concurrently. This would likely entail changing updates to be partial but would need further understanding.


