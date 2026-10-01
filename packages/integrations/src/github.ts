import { Octokit } from '@octokit/rest';
import { getSecret } from '../../auth/src/secrets.js';

async function client() {
  const token = await getSecret('github-token') ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN_NOT_CONFIGURED');
  return new Octokit({ auth: token });
}

export async function githubStatus() {
  const api = await client();
  const result = await api.rest.users.getAuthenticated();
  return { login: result.data.login, id: result.data.id };
}

export async function listRepositories() {
  const api = await client();
  const result = await api.rest.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });
  return result.data.map(repo => ({
    id: repo.id, name: repo.name, fullName: repo.full_name,
    private: repo.private, url: repo.html_url, defaultBranch: repo.default_branch
  }));
}

export async function createRepository(name: string, description?: string, isPrivate = true) {
  const api = await client();
  const result = await api.rest.repos.createForAuthenticatedUser({
    name, description, private: isPrivate
  });
  return { name: result.data.name, fullName: result.data.full_name, url: result.data.html_url };
}

export async function createIssue(owner: string, repo: string, title: string, body?: string) {
  const api = await client();
  const result = await api.rest.issues.create({ owner, repo, title, body });
  return { number: result.data.number, url: result.data.html_url };
}

export async function createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string) {
  const api = await client();
  const result = await api.rest.pulls.create({ owner, repo, title, head, base, body });
  return { number: result.data.number, url: result.data.html_url };
}
