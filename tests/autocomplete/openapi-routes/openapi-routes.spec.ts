import fs from 'fs';
import path from 'path';
import { test, expect } from '../../../playwright';
import { createCollection, createRequest, selectRequestPaneTab } from '../../utils/page';
import { expandApiSpecsSection, openApiSpecFromDialog, removeApiSpecFromWorkspace } from '../../utils/page/openapi/render-spec';

const COLLECTION_NAME = 'openapi-routes';
const SPEC_TITLE = 'Pets API';

const SPEC = `openapi: 3.0.0
info:
  title: ${SPEC_TITLE}
  version: 1.0.0
servers:
  - url: https://api.pets.test/v1
paths:
  /pets:
    get:
      summary: List pets
    post:
      summary: Create a pet
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:
                  type: string
                age:
                  type: integer
  /pets/{petId}:
    get:
      summary: Get a pet
      parameters:
        - name: petId
          in: path
          required: true
          schema:
            type: string
  /owners:
    get:
      summary: List owners
`;

test.describe('Route suggestions from an OpenAPI description', () => {
  test('typing a path in the URL bar suggests the routes, and choosing one completes the request', async ({ page, electronApp, createTmpDir }) => {
    test.setTimeout(2 * 60 * 1000);
    const dir = await createTmpDir('openapi-routes');
    const specPath = path.join(dir, 'pets.yaml');
    fs.writeFileSync(specPath, SPEC);

    const urlEditor = page.getByTestId('request-url').locator('.CodeMirror');
    const suggestions = page.getByTestId('route-suggestion');
    const typeAtEnd = async (text: string) => {
      await urlEditor.click();
      await page.keyboard.press('End');
      await page.keyboard.type(text);
    };

    await createCollection(page, COLLECTION_NAME, dir);
    await createRequest(page, 'new pet', COLLECTION_NAME, { url: 'http://localhost:3000' });

    await test.step('Without a description nothing is suggested', async () => {
      await typeAtEnd('/pe');
      await expect(urlEditor).toContainText('http://localhost:3000/pe');
      await expect(suggestions).toHaveCount(0);
    });

    try {
      await test.step('Open the description under API Specs', async () => {
        await expandApiSpecsSection(page);
        await openApiSpecFromDialog(page, electronApp, specPath);
        await expect(page.getByText(SPEC_TITLE).first()).toBeVisible();
        await page.locator('.collection-item-name').filter({ hasText: 'new pet' }).click();
        await expect(urlEditor).toContainText('http://localhost:3000/pe');
      });

      await test.step('Typing more of the path lists the routes that fit', async () => {
        await typeAtEnd('t');
        await expect(suggestions).toHaveCount(3);
        await expect(suggestions.filter({ hasText: 'Create a pet' })).toContainText('POST');
        await expect(suggestions.filter({ hasText: 'List owners' })).toHaveCount(0);
      });

      await test.step('Choosing one keeps the typed server and fills in the path, the method and the body', async () => {
        await suggestions.filter({ hasText: 'Create a pet' }).click();
        await expect(urlEditor).toContainText('http://localhost:3000/pets');
        await expect(page.getByTestId('request-url').locator('..')).toContainText('POST');

        await selectRequestPaneTab(page, 'Body');
        await expect(page.getByTestId('request-pane')).toContainText('"name"');
        await expect(page.getByTestId('request-pane')).toContainText('"age"');
      });

      await test.step('A route with a parameter creates the path parameter', async () => {
        await typeAtEnd('/');
        await suggestions.filter({ hasText: 'Get a pet' }).click();
        await expect(urlEditor).toContainText('http://localhost:3000/pets/:petId');

        await selectRequestPaneTab(page, 'Params');
        await expect(page.getByTestId('request-pane').locator('input[value="petId"]')).toBeVisible();
      });
    } finally {
      await removeApiSpecFromWorkspace(page, SPEC_TITLE);
    }
  });
});
