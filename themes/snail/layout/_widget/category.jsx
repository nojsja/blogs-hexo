import React from 'react';

export default function Category({ site, __ }) {
  return (
    site.categories.length && (
      <>
        <h5>{__('categories')}</h5>
        <div className="widget">
          <ul>
            {
              site.categories.map((category) => <a key={category.name} href={`categories/#${category.name}`}><li>{category.name}</li></a>)
            }
          </ul>
        </div>
      </>
    )
  );
}
