import { Modal, App, Setting, Notice, TFile } from 'obsidian';
import type VaultPilotPlugin from '../main';
import { Agent } from '../types';

interface MarketplaceAgent extends Agent {
  author: string;
  version: string;
  downloads: number;
  rating: number;
  reviewCount: number;
  category: string;
  tags: string[];
  screenshots: string[];
  documentation: string;
  price: number;
  featured: boolean;
  lastUpdated: string;
}

interface MarketplaceCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}

interface InstallationOptions {
  autoStart: boolean;
  customConfig: Record<string, any>;
  permissions: string[];
}

export class AgentMarketplaceModal extends Modal {
  private plugin: VaultPilotPlugin;
  private currentCategory: string = 'all';
  private searchQuery: string = '';
  private sortBy: 'popular' | 'recent' | 'rating' | 'name' = 'popular';
  private installedAgents: Set<string> = new Set();
  private marketplaceAgents: MarketplaceAgent[] = [];
  private categories: MarketplaceCategory[] = [];
  private headerEl!: HTMLElement;
  private searchEl!: HTMLInputElement;
  private categoryEl!: HTMLElement;
  private sortEl!: HTMLSelectElement;
  private agentsGridEl!: HTMLElement;
  private loadingEl!: HTMLElement;
  private paginationEl!: HTMLElement;
  private currentPage: number = 1;
  private totalPages: number = 1;
  private itemsPerPage: number = 12;

  constructor(app: App, plugin: VaultPilotPlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('agent-marketplace-modal');

    // Create header with search and filters
    this.createHeader();
    
    // Create main content area
    this.createMainContent();
    
    // Load initial data
    await this.loadMarketplaceData();
    await this.loadInstalledAgents();
    
    // Render the marketplace
    this.renderMarketplace();
  }

  private createHeader() {
    this.headerEl = this.contentEl.createEl('div', { cls: 'marketplace-header' });
    
    // Title and subtitle
    const titleEl = this.headerEl.createEl('div', { cls: 'marketplace-title' });
    titleEl.createEl('h2', { text: 'Agent Marketplace' });
    titleEl.createEl('p', { text: 'Discover and install AI agents to enhance your workflow' });

    // Search bar
    const searchContainer = this.headerEl.createEl('div', { cls: 'marketplace-search' });
    this.searchEl = searchContainer.createEl('input', {
      type: 'search',
      placeholder: 'Search agents...',
      cls: 'search-input'
    });
    
    this.searchEl.addEventListener('input', () => {
      this.searchQuery = this.searchEl.value;
      this.currentPage = 1;
      this.renderMarketplace();
    });

    // Filters container
    const filtersEl = this.headerEl.createEl('div', { cls: 'marketplace-filters' });
    
    // Category filter
    const categoryContainer = filtersEl.createEl('div', { cls: 'filter-group' });
    categoryContainer.createEl('label', { text: 'Category:' });
    this.categoryEl = categoryContainer.createEl('div', { cls: 'category-pills' });
    
    // Sort filter
    const sortContainer = filtersEl.createEl('div', { cls: 'filter-group' });
    sortContainer.createEl('label', { text: 'Sort by:' });
    this.sortEl = sortContainer.createEl('select', { cls: 'sort-select' });
    
    [
      { value: 'popular', text: 'Most Popular' },
      { value: 'recent', text: 'Recently Updated' },
      { value: 'rating', text: 'Highest Rated' },
      { value: 'name', text: 'Name A-Z' }
    ].forEach(option => {
      this.sortEl.createEl('option', { 
        value: option.value, 
        text: option.text 
      });
    });
    
    this.sortEl.addEventListener('change', () => {
      this.sortBy = this.sortEl.value as any;
      this.currentPage = 1;
      this.renderMarketplace();
    });
  }

  private createMainContent() {
    const mainEl = this.contentEl.createEl('div', { cls: 'marketplace-main' });
    
    // Loading indicator
    this.loadingEl = mainEl.createEl('div', { 
      cls: 'marketplace-loading',
      text: 'Loading marketplace...'
    });
    
    // Agents grid
    this.agentsGridEl = mainEl.createEl('div', { cls: 'agents-grid' });
    
    // Pagination
    this.paginationEl = mainEl.createEl('div', { cls: 'marketplace-pagination' });
  }

  private async loadMarketplaceData() {
    try {
      this.showLoading(true);
      
      // Load categories
      const categoriesResponse = await fetch(`${this.plugin.settings.backendUrl}/marketplace/categories`);
      if (categoriesResponse.ok) {
        const data = await categoriesResponse.json();
        this.categories = data.data || data;
        this.renderCategories();
      }
      
      // Load agents
      const params = new URLSearchParams({
        page: this.currentPage.toString(),
        limit: this.itemsPerPage.toString(),
        sort: this.sortBy
      });
      
      if (this.currentCategory !== 'all') {
        params.append('category', this.currentCategory);
      }
      if (this.searchQuery) {
        params.append('search', this.searchQuery);
      }
      
      const agentsResponse = await fetch(`${this.plugin.settings.backendUrl}/marketplace/agents?${params}`);
      
      if (agentsResponse.ok) {
        const data = await agentsResponse.json();
        this.marketplaceAgents = data.data?.agents || data.agents || data;
        this.totalPages = data.data?.totalPages || data.totalPages || 1;
      }
      
    } catch (error) {
      console.error('Failed to load marketplace data:', error);
      new Notice('Failed to load marketplace data');
    } finally {
      this.showLoading(false);
    }
  }

  private async loadInstalledAgents() {
    try {
      const response = await this.plugin.apiClient.getAgents();
      if (response.success && response.data) {
        const agents = Array.isArray(response.data) ? response.data : (response.data as any).agents || [];
        this.installedAgents = new Set(
          agents.map((agent: any) => agent.id)
        );
      }
    } catch (error) {
      console.error('Failed to load installed agents:', error);
    }
  }

  private renderCategories() {
    this.categoryEl.empty();
    
    // Add "All" category
    const allPill = this.categoryEl.createEl('button', {
      cls: `category-pill ${this.currentCategory === 'all' ? 'active' : ''}`,
      text: 'All'
    });
    
    allPill.addEventListener('click', () => {
      this.currentCategory = 'all';
      this.currentPage = 1;
      this.renderMarketplace();
      this.updateCategoryPills();
    });
    
    // Add category pills
    this.categories.forEach(category => {
      const pill = this.categoryEl.createEl('button', {
        cls: `category-pill ${this.currentCategory === category.id ? 'active' : ''}`,
        text: `${category.name} (${category.count})`
      });
      
      pill.addEventListener('click', () => {
        this.currentCategory = category.id;
        this.currentPage = 1;
        this.renderMarketplace();
        this.updateCategoryPills();
      });
    });
  }

  private updateCategoryPills() {
    this.categoryEl.querySelectorAll('.category-pill').forEach((pill, index) => {
      const isAllCategory = index === 0;
      const isActive = isAllCategory 
        ? this.currentCategory === 'all'
        : this.currentCategory === this.categories[index - 1]?.id;
      
      pill.toggleClass('active', isActive);
    });
  }

  private async renderMarketplace() {
    await this.loadMarketplaceData();
    this.renderAgentsGrid();
    this.renderPagination();
  }

  private renderAgentsGrid() {
    this.agentsGridEl.empty();
    
    if (this.marketplaceAgents.length === 0) {
      this.agentsGridEl.createEl('div', {
        cls: 'no-agents',
        text: 'No agents found matching your criteria.'
      });
      return;
    }
    
    this.marketplaceAgents.forEach(agent => {
      const agentCard = this.agentsGridEl.createEl('div', { cls: 'agent-card' });
      
      if (agent.featured) {
        agentCard.addClass('featured');
      }
      
      // Agent header
      const headerEl = agentCard.createEl('div', { cls: 'agent-header' });
      
      // Featured badge
      if (agent.featured) {
        headerEl.createEl('div', { cls: 'featured-badge', text: 'Featured' });
      }
      
      // Agent name and author
      const infoEl = headerEl.createEl('div', { cls: 'agent-info' });
      infoEl.createEl('h3', { text: agent.name, cls: 'agent-name' });
      infoEl.createEl('p', { text: `by ${agent.author}`, cls: 'agent-author' });
      
      // Rating and stats
      const statsEl = headerEl.createEl('div', { cls: 'agent-stats' });
      const ratingEl = statsEl.createEl('div', { cls: 'rating' });
      
      // Star rating
      for (let i = 1; i <= 5; i++) {
        ratingEl.createEl('span', {
          cls: `star ${i <= agent.rating ? 'filled' : 'empty'}`,
          text: '★'
        });
      }
      ratingEl.createEl('span', { text: `(${agent.reviewCount})`, cls: 'review-count' });
      
      statsEl.createEl('div', { text: `${agent.downloads} downloads`, cls: 'downloads' });
      
      // Description
      agentCard.createEl('p', { text: agent.description, cls: 'agent-description' });
      
      // Tags
      const tagsEl = agentCard.createEl('div', { cls: 'agent-tags' });
      agent.tags.slice(0, 3).forEach(tag => {
        tagsEl.createEl('span', { text: tag, cls: 'tag' });
      });
      
      // Footer with price and actions
      const footerEl = agentCard.createEl('div', { cls: 'agent-footer' });
      
      const priceEl = footerEl.createEl('div', { cls: 'agent-price' });
      if (agent.price === 0) {
        priceEl.createEl('span', { text: 'Free', cls: 'price free' });
      } else {
        priceEl.createEl('span', { text: `$${agent.price}`, cls: 'price paid' });
      }
      
      const actionsEl = footerEl.createEl('div', { cls: 'agent-actions' });
      
      // View details button
      const detailsBtn = actionsEl.createEl('button', {
        text: 'Details',
        cls: 'btn-secondary'
      });
      
      detailsBtn.addEventListener('click', () => {
        this.showAgentDetails(agent);
      });
      
      // Install/Manage button
      const isInstalled = this.installedAgents.has(agent.id);
      const installBtn = actionsEl.createEl('button', {
        text: isInstalled ? 'Manage' : 'Install',
        cls: isInstalled ? 'btn-primary installed' : 'btn-primary'
      });
      
      installBtn.addEventListener('click', async () => {
        if (isInstalled) {
          this.manageAgent(agent);
        } else {
          await this.installAgent(agent);
        }
      });
    });
  }

  private renderPagination() {
    this.paginationEl.empty();
    
    if (this.totalPages <= 1) return;
    
    const prevBtn = this.paginationEl.createEl('button', {
      text: '← Previous',
      cls: 'pagination-btn'
    });
    
    if (this.currentPage === 1) {
      prevBtn.disabled = true;
    }
    
    prevBtn.addEventListener('click', () => {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.renderMarketplace();
      }
    });
    
    const pageInfo = this.paginationEl.createEl('span', {
      text: `Page ${this.currentPage} of ${this.totalPages}`,
      cls: 'page-info'
    });
    
    const nextBtn = this.paginationEl.createEl('button', {
      text: 'Next →',
      cls: 'pagination-btn'
    });
    
    if (this.currentPage === this.totalPages) {
      nextBtn.disabled = true;
    }
    
    nextBtn.addEventListener('click', () => {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.renderMarketplace();
      }
    });
  }

  private async showAgentDetails(agent: MarketplaceAgent) {
    // Create a detailed view modal for the agent
    const detailModal = new AgentDetailModal(this.app, this.plugin, agent, this.installedAgents.has(agent.id));
    detailModal.open();
  }

  private async installAgent(agent: MarketplaceAgent) {
    try {
      const installModal = new AgentInstallModal(this.app, this.plugin, agent);
      const result = await installModal.openAndWait();
      
      if (result) {
        new Notice(`Installing ${agent.name}...`);
        
        const response = await fetch(`${this.plugin.settings.backendUrl}/marketplace/install`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent.id,
            options: result
          })
        });
        
        if (response.ok) {
          new Notice(`${agent.name} installed successfully!`);
          this.installedAgents.add(agent.id);
          this.renderAgentsGrid(); // Refresh the grid
        } else {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Installation failed');
        }
      }
    } catch (error) {
      console.error('Agent installation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      new Notice(`Failed to install ${agent.name}: ${errorMessage}`);
    }
  }

  private manageAgent(agent: MarketplaceAgent) {
    // Open agent management interface
    const manageModal = new AgentManageModal(this.app, this.plugin, agent);
    manageModal.open();
  }

  private showLoading(show: boolean) {
    this.loadingEl.style.display = show ? 'block' : 'none';
    this.agentsGridEl.style.display = show ? 'none' : 'grid';
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// Placeholder classes for related modals
class AgentDetailModal extends Modal {
  constructor(app: App, plugin: VaultPilotPlugin, agent: MarketplaceAgent, isInstalled: boolean) {
    super(app);
    // Implementation for detailed agent view
  }
}

class AgentInstallModal extends Modal {
  constructor(app: App, plugin: VaultPilotPlugin, agent: MarketplaceAgent) {
    super(app);
    // Implementation for installation options
  }
  
  async openAndWait(): Promise<InstallationOptions | null> {
    return new Promise((resolve) => {
      // Implementation for modal result
      resolve(null);
    });
  }
}

class AgentManageModal extends Modal {
  constructor(app: App, plugin: VaultPilotPlugin, agent: MarketplaceAgent) {
    super(app);
    // Implementation for agent management
  }
}
