import { gql } from '@apollo/client';

export const ASSET_FIELDS = gql`
  fragment AssetFields on Asset {
    id
    code
    description
    brand
    model
    serialNumber
    value
    purchaseDate
    status
    observations
    category {
      id
      name
    }
    department {
      id
      name
    }
    responsable {
      id
      fullName
    }
    createdAt
    updatedAt
  }
`;

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        fullName
        email
        role {
          id
          name
        }
      }
    }
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      fullName
      email
      role {
        id
        name
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout
  }
`;

export const DASHBOARD_STATS = gql`
  query DashboardStats {
    dashboardStats {
      totalAssets
      activeAssets
      retiredAssets
      maintenanceAssets
      totalValue
      totalDepartments
      totalCategories
      byDepartment {
        label
        count
        value
      }
      byCategory {
        label
        count
        value
      }
      byStatus {
        label
        count
        value
      }
      monthlyMovements {
        month
        count
      }
    }
    recentMovements(limit: 8) {
      id
      field
      oldValue
      newValue
      createdAt
      user {
        fullName
      }
    }
  }
`;

export const ASSETS = gql`
  ${ASSET_FIELDS}
  query Assets($filter: AssetsFilterInput) {
    assets(filter: $filter) {
      items {
        ...AssetFields
      }
      total
      page
      limit
      totalPages
    }
  }
`;

export const ASSET_BY_CODE = gql`
  ${ASSET_FIELDS}
  query AssetByCode($code: String!) {
    assetByCode(code: $code) {
      ...AssetFields
    }
  }
`;

export const ASSET_MOVEMENTS = gql`
  query AssetMovements($assetId: ID!) {
    assetMovements(assetId: $assetId) {
      id
      field
      oldValue
      newValue
      createdAt
      user {
        fullName
      }
    }
  }
`;

export const CREATE_ASSET = gql`
  ${ASSET_FIELDS}
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input) {
      ...AssetFields
    }
  }
`;

export const UPDATE_ASSET = gql`
  ${ASSET_FIELDS}
  mutation UpdateAsset($input: UpdateAssetInput!) {
    updateAsset(input: $input) {
      ...AssetFields
    }
  }
`;

export const REMOVE_ASSET = gql`
  mutation RemoveAsset($id: ID!) {
    removeAsset(id: $id)
  }
`;

export const CATALOGS = gql`
  query Catalogs {
    departments {
      id
      name
      code
      location
      isActive
    }
    categories {
      id
      name
      description
      depreciationRate
    }
    responsables {
      id
      fullName
      email
      phone
      position
      isActive
    }
  }
`;

export const DEPARTMENTS = gql`
  query Departments {
    departments {
      id
      name
      code
      location
      isActive
    }
  }
`;
export const DEPARTMENT_FIELDS = gql`
  fragment DepartmentFields on Department {
    id
    name
    code
    location
    isActive
  }
`;
export const CREATE_DEPARTMENT = gql`
  ${DEPARTMENT_FIELDS}
  mutation CreateDepartment($input: CreateDepartmentInput!) {
    createDepartment(input: $input) {
      ...DepartmentFields
    }
  }
`;
export const UPDATE_DEPARTMENT = gql`
  ${DEPARTMENT_FIELDS}
  mutation UpdateDepartment($input: UpdateDepartmentInput!) {
    updateDepartment(input: $input) {
      ...DepartmentFields
    }
  }
`;
export const REMOVE_DEPARTMENT = gql`
  mutation RemoveDepartment($id: ID!) {
    removeDepartment(id: $id)
  }
`;

export const CATEGORIES = gql`
  query Categories {
    categories {
      id
      name
      description
      depreciationRate
    }
  }
`;
export const CATEGORY_FIELDS = gql`
  fragment CategoryFields on Category {
    id
    name
    description
    depreciationRate
  }
`;
export const CREATE_CATEGORY = gql`
  ${CATEGORY_FIELDS}
  mutation CreateCategory($input: CreateCategoryInput!) {
    createCategory(input: $input) {
      ...CategoryFields
    }
  }
`;
export const UPDATE_CATEGORY = gql`
  ${CATEGORY_FIELDS}
  mutation UpdateCategory($input: UpdateCategoryInput!) {
    updateCategory(input: $input) {
      ...CategoryFields
    }
  }
`;
export const REMOVE_CATEGORY = gql`
  mutation RemoveCategory($id: ID!) {
    removeCategory(id: $id)
  }
`;

export const RESPONSABLES = gql`
  query Responsables {
    responsables {
      id
      fullName
      email
      phone
      position
      isActive
    }
  }
`;
export const RESPONSABLE_FIELDS = gql`
  fragment ResponsableFields on Responsable {
    id
    fullName
    email
    phone
    position
    isActive
  }
`;
export const CREATE_RESPONSABLE = gql`
  ${RESPONSABLE_FIELDS}
  mutation CreateResponsable($input: CreateResponsableInput!) {
    createResponsable(input: $input) {
      ...ResponsableFields
    }
  }
`;
export const UPDATE_RESPONSABLE = gql`
  ${RESPONSABLE_FIELDS}
  mutation UpdateResponsable($input: UpdateResponsableInput!) {
    updateResponsable(input: $input) {
      ...ResponsableFields
    }
  }
`;
export const REMOVE_RESPONSABLE = gql`
  mutation RemoveResponsable($id: ID!) {
    removeResponsable(id: $id)
  }
`;

export const USERS = gql`
  query Users {
    users {
      id
      fullName
      email
      isActive
      lastLoginAt
      role {
        id
        name
      }
    }
    roles {
      id
      name
    }
  }
`;
export const CREATE_USER = gql`
  mutation CreateUser($input: CreateUserInput!) {
    createUser(input: $input) {
      id
      fullName
      email
      isActive
      role { id name }
    }
  }
`;
export const UPDATE_USER = gql`
  mutation UpdateUser($input: UpdateUserInput!) {
    updateUser(input: $input) {
      id
      fullName
      email
      isActive
      role { id name }
    }
  }
`;
export const REMOVE_USER = gql`
  mutation RemoveUser($id: ID!) {
    removeUser(id: $id)
  }
`;

export const AUDIT_LOGS = gql`
  query AuditLogs($limit: Int) {
    auditLogs(limit: $limit) {
      id
      action
      entity
      entityId
      details
      ipAddress
      createdAt
      user {
        fullName
        email
      }
    }
  }
`;

export const RECENT_IMPORTS = gql`
  query RecentImports($limit: Int) {
    recentImports(limit: $limit) {
      id
      filename
      totalRows
      inserted
      updated
      skipped
      errorCount
      createdAt
      user {
        fullName
      }
    }
  }
`;
